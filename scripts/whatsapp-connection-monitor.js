#!/usr/bin/env node

/**
 * Monitor de Conexão WhatsApp
 * Monitora o status das conexões WhatsApp e dispara reprocessamento de lembretes
 * quando uma instância se reconecta
 */

// Carregar variáveis de ambiente
require('dotenv').config({ path: '../.env' });

const mysql = require('mysql2/promise');
const fetch = require('node-fetch');

// Configuração do banco de dados
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'iptv_manager',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Configuração do WhatsApp
const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'http://localhost:3002';
const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY || 'gestplay-api-key-2024';

// Pool de conexões
let pool;

// Cache de status de conexão
const connectionStatusCache = new Map();

/**
 * Inicializar pool de conexões
 */
async function initDatabase() {
  try {
    pool = mysql.createPool(DB_CONFIG);
    console.log('✅ Conexão com banco de dados estabelecida');

    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();

    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar ao banco de dados:', error.message);
    return false;
  }
}

/**
 * Extrair ID numérico do reseller_id
 */
function extractNumericId(resellerId) {
  let cleanId = resellerId.startsWith('reseller_') 
    ? resellerId.replace('reseller_', '') 
    : resellerId;
  
  const numericMatch = cleanId.match(/^(\d+)/);
  if (numericMatch) {
    return numericMatch[1];
  }
  
  return cleanId;
}

/**
 * Verificar se a instância WhatsApp está conectada
 */
async function checkWhatsAppConnection(resellerId) {
  try {
    const numericId = extractNumericId(resellerId);
    const instanceName = `reseller_${numericId}`;
    
    const response = await fetch(
      `${WHATSAPP_API_URL}/instance/connectionState/${instanceName}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': WHATSAPP_API_KEY,
        },
      }
    );

    if (!response.ok) {
      return { connected: false, error: `API error: ${response.status}` };
    }

    const result = await response.json();
    const isConnected = result?.instance?.state === 'open';
    
    return {
      connected: isConnected,
      state: result?.instance?.state || 'unknown',
      instanceName: instanceName
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message
    };
  }
}

/**
 * Disparar reprocessamento de lembretes via API interna
 */
async function triggerReminderReprocessing(resellerId) {
  try {
    console.log(`🔄 Disparando reprocessamento de lembretes para ${resellerId}...`);
    
    // Chamar endpoint interno do reminder-processor (se disponível)
    const reminderPort = process.env.REMINDER_STATUS_PORT || 3003;
    
    try {
      const response = await fetch(`http://localhost:${reminderPort}/reprocess/${resellerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        console.log(`✅ Reprocessamento disparado com sucesso para ${resellerId}`);
      } else {
        console.log(`⚠️ Falha ao disparar reprocessamento via API para ${resellerId}`);
      }
    } catch (apiError) {
      // Se a API não estiver disponível, fazer reprocessamento direto
      console.log(`📝 API não disponível, fazendo reprocessamento direto para ${resellerId}`);
      await reprocessPendingRemindersDirect(resellerId);
    }
  } catch (error) {
    console.error(`❌ Erro ao disparar reprocessamento:`, error);
  }
}

/**
 * Reprocessamento direto de lembretes pendentes
 */
async function reprocessPendingRemindersDirect(resellerId) {
  try {
    // Buscar logs pendentes ou falhados de hoje
    const [pendingLogs] = await pool.query(
      `SELECT wrl.*, c.name as client_name, c.phone
       FROM whatsapp_reminder_logs wrl
       JOIN clients c ON wrl.client_id = c.id
       WHERE wrl.reseller_id = ? 
       AND wrl.status IN ('pending', 'failed')
       AND DATE(wrl.created_at) = CURDATE()
       AND wrl.retry_count < 3
       ORDER BY wrl.created_at ASC`,
      [resellerId]
    );

    if (pendingLogs.length === 0) {
      return;
    }

    console.log(`   📋 Encontrados ${pendingLogs.length} lembretes pendentes`);

    for (const log of pendingLogs) {
      // Tentar enviar via WhatsApp
      const numericId = extractNumericId(resellerId);
      const instanceName = `reseller_${numericId}`;
      
      try {
        const response = await fetch(
          `${WHATSAPP_API_URL}/message/sendText/${instanceName}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': WHATSAPP_API_KEY,
            },
            body: JSON.stringify({
              number: log.phone,
              text: log.message_content,
            }),
          }
        );

        if (response.ok) {
          const result = await response.json();
          
          // Atualizar status para enviado
          await pool.query(
            `UPDATE whatsapp_reminder_logs 
             SET status = 'sent', sent_at = NOW(), whatsapp_message_id = ?, updated_at = NOW()
             WHERE id = ?`,
            [result?.key?.id || result?.messageId, log.id]
          );
          
          console.log(`   ✅ Reenviado: ${log.client_name}`);
        } else {
          // Incrementar contador de tentativas
          await pool.query(
            `UPDATE whatsapp_reminder_logs 
             SET retry_count = retry_count + 1, error_message = ?, updated_at = NOW()
             WHERE id = ?`,
            [`HTTP ${response.status}`, log.id]
          );
          
          console.log(`   ❌ Falha ao reenviar: ${log.client_name}`);
        }
      } catch (sendError) {
        console.error(`   ❌ Erro ao enviar para ${log.client_name}:`, sendError.message);
      }

      // Delay entre envios
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } catch (error) {
    console.error(`❌ Erro no reprocessamento direto:`, error);
  }
}

/**
 * Monitorar conexões WhatsApp
 */
async function monitorConnections() {
  try {
    // Buscar todos os resellers ativos com verificação de assinatura
    const [resellers] = await pool.query(
      `SELECT DISTINCT wrs.reseller_id, r.is_admin, r.subscription_expiry_date, r.account_status
       FROM whatsapp_reminder_settings wrs
       JOIN resellers r ON wrs.reseller_id = r.id
       WHERE wrs.is_enabled = 1 AND r.is_active = 1`
    );

    for (const reseller of resellers) {
      const resellerId = reseller.reseller_id;

      // ✅ VERIFICAR ASSINATURA DO RESELLER
      // Admin sempre tem acesso
      if (!reseller.is_admin) {
        const expiryDate = reseller.subscription_expiry_date;
        const today = new Date().toISOString().split('T')[0];

        if (!expiryDate || expiryDate < today) {
          // Assinatura expirada, pular monitoramento
          continue;
        }

        if (reseller.account_status !== 'active' && reseller.account_status !== 'trial') {
          // Conta inativa, pular monitoramento
          continue;
        }
      }
      
      // Verificar status atual
      const currentStatus = await checkWhatsAppConnection(resellerId);
      const previousStatus = connectionStatusCache.get(resellerId);
      
      // Detectar mudança de desconectado para conectado
      if (currentStatus.connected && previousStatus === false) {
        console.log(`🔄 ${resellerId}: WhatsApp reconectado! Disparando reprocessamento...`);
        await triggerReminderReprocessing(resellerId);
      }
      
      // Atualizar cache
      connectionStatusCache.set(resellerId, currentStatus.connected);
      
      // Log de status (apenas mudanças)
      if (previousStatus !== undefined && previousStatus !== currentStatus.connected) {
        const statusText = currentStatus.connected ? 'CONECTADO' : 'DESCONECTADO';
        console.log(`📱 ${resellerId}: ${statusText} (${currentStatus.state})`);
      }
    }
  } catch (error) {
    console.error('❌ Erro ao monitorar conexões:', error);
  }
}

/**
 * Inicializar monitor
 */
async function start() {
  console.log('🔍 Iniciando Monitor de Conexão WhatsApp');
  console.log('==========================================');
  console.log(`📅 Data/Hora: ${new Date().toLocaleString()}`);
  console.log(`📱 WhatsApp: ${WHATSAPP_API_URL}`);
  console.log('');

  // Inicializar banco
  const dbConnected = await initDatabase();
  if (!dbConnected) {
    console.error('❌ Não foi possível conectar ao banco de dados. Encerrando...');
    process.exit(1);
  }

  // Monitorar imediatamente
  await monitorConnections();

  // Configurar intervalo de monitoramento (a cada 30 segundos)
  const intervalSeconds = parseInt(process.env.CONNECTION_CHECK_INTERVAL || '30');
  const intervalMs = intervalSeconds * 1000;

  console.log(`⏰ Monitorando conexões a cada ${intervalSeconds} segundos`);
  console.log('💡 Pressione Ctrl+C para encerrar\n');

  setInterval(monitorConnections, intervalMs);
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n🔄 Encerrando monitor graciosamente...');
  if (pool) {
    await pool.end();
  }
  console.log('✅ Monitor encerrado');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n🔄 Encerrando monitor graciosamente...');
  if (pool) {
    await pool.end();
  }
  console.log('✅ Monitor encerrado');
  process.exit(0);
});

// Iniciar
start().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});