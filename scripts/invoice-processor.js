#!/usr/bin/env node

/**
 * Processador Automático de Faturas + WhatsApp
 * Roda independente do frontend, processando faturas 24/7
 */

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
const WHATSAPP_INSTANCE = process.env.WHATSAPP_INSTANCE || 'gestplay-instance';

// Configuração
const DAYS_BEFORE_EXPIRY = parseInt(process.env.INVOICE_DAYS_BEFORE || '10');

// Pool de conexões
let pool;

// Estatísticas
const stats = {
  totalGenerated: 0,
  totalSkipped: 0,
  totalWhatsAppSent: 0,
  totalWhatsAppFailed: 0,
  lastProcessTime: null,
  startTime: new Date()
};

/**
 * Inicializar pool de conexões
 */
async function initDatabase() {
  try {
    pool = mysql.createPool(DB_CONFIG);
    console.log('✅ Conexão com banco de dados estabelecida');

    // Testar conexão
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
 * Formatar telefone para WhatsApp
 */
function formatPhone(phone) {
  if (!phone) return null;

  const cleaned = phone.replace(/\D/g, '');
  let number = cleaned;

  // Remover código do país se já tiver
  if (number.startsWith('55') && number.length > 11) {
    number = number.slice(2);
  }

  // Pegar últimos 11 dígitos
  if (number.length > 11) {
    number = number.slice(-11);
  }

  // Validar formato brasileiro
  if (number.length === 11 || number.length === 10) {
    const ddd = parseInt(number.slice(0, 2));
    if (ddd >= 11 && ddd <= 99) {
      return '55' + number;
    }
  }

  return null;
}

/**
 * Processar variáveis na mensagem
 */
function processMessageVariables(message, client, dueDate, value, planName) {
  let processed = message;

  // Formatar data
  const dueDateObj = new Date(dueDate);
  const formattedDate = dueDateObj.toLocaleDateString('pt-BR');

  // Formatar valor
  const formattedValue = parseFloat(value).toFixed(2).replace('.', ',');

  // Mapa de variáveis
  const variables = {
    'cliente_nome': client.name || '',
    'CLIENT_NAME': client.name || '',
    'data_vencimento': formattedDate,
    'DUE_DATE': formattedDate,
    'valor': formattedValue,
    'AMOUNT': formattedValue,
    'plano': planName || 'Plano',
    'PLAN_NAME': planName || 'Plano',
    'plano_nome': planName || 'Plano',
  };

  // Substituir variáveis (suporta {{var}} e {var})
  Object.keys(variables).forEach(key => {
    const value = variables[key];
    processed = processed.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'gi'), value);
    processed = processed.replace(new RegExp(`\\{${key}\\}`, 'gi'), value);
  });

  return processed;
}

/**
 * Enviar mensagem via WhatsApp
 */
async function sendWhatsAppMessage(phone, message) {
  try {
    const formattedPhone = formatPhone(phone);

    if (!formattedPhone) {
      throw new Error('Telefone inválido');
    }

    const response = await fetch(
      `${WHATSAPP_API_URL}/message/sendText/${WHATSAPP_INSTANCE}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': WHATSAPP_API_KEY,
        },
        body: JSON.stringify({
          number: formattedPhone,
          text: message,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`WhatsApp API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return {
      success: true,
      messageId: result?.key?.id || result?.messageId,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Verificar se já existe log de WhatsApp para esta fatura
 */
async function checkExistingWhatsAppLog(invoiceId) {
  try {
    const [rows] = await pool.query(
      `SELECT id FROM whatsapp_invoice_logs 
       WHERE invoice_id = ? 
       LIMIT 1`,
      [invoiceId]
    );

    return rows.length > 0;
  } catch (error) {
    console.error('Erro ao verificar log de WhatsApp:', error);
    return false;
  }
}

/**
 * Criar log de WhatsApp
 */
async function createWhatsAppLog(invoiceId, clientId, resellerId, phone, message, status, errorMessage = null) {
  try {
    const logId = `wlog_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    await pool.query(
      `INSERT INTO whatsapp_invoice_logs 
       (id, invoice_id, client_id, reseller_id, phone, message, sent_at, status, error_message)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?)`,
      [logId, invoiceId, clientId, resellerId, phone, message, status, errorMessage]
    );

    return logId;
  } catch (error) {
    console.error('Erro ao criar log de WhatsApp:', error);
    return null;
  }
}

/**
 * Processar faturas
 */
async function processInvoices() {
  const startTime = Date.now();
  console.log(`\n🔄 [${new Date().toLocaleString()}] Iniciando processamento de faturas...`);

  try {
    // Buscar resellers ativos
    const [resellers] = await pool.query(
      `SELECT id, email, display_name 
       FROM resellers 
       WHERE is_active = 1`
    );

    if (resellers.length === 0) {
      console.log('⚠️  Nenhum reseller ativo encontrado');
      return;
    }

    console.log(`📋 Encontrados ${resellers.length} reseller(s) ativo(s)`);

    let totalGenerated = 0;
    let totalSkipped = 0;
    let totalWhatsAppSent = 0;
    let totalWhatsAppFailed = 0;

    for (const reseller of resellers) {
      const resellerId = reseller.id;

      // Buscar clientes ativos que precisam de fatura
      const [clients] = await pool.query(
        `SELECT c.*, p.name as plan_name
         FROM clients c
         LEFT JOIN plans p ON c.plan_id = p.id
         WHERE c.reseller_id = ? 
         AND c.status = 'active'
         AND DATEDIFF(c.renewal_date, CURDATE()) <= ?
         AND DATEDIFF(c.renewal_date, CURDATE()) >= 0`,
        [resellerId, DAYS_BEFORE_EXPIRY]
      );

      if (clients.length === 0) continue;

      console.log(`\n👤 Reseller: ${reseller.email}`);
      console.log(`   📊 ${clients.length} cliente(s) precisam de fatura`);

      for (const client of clients) {
        try {
          const clientId = client.id;
          const clientName = client.name;
          const renewalDate = client.renewal_date;
          const value = client.value;
          const planName = client.plan_name || 'Plano';

          // Verificar se já existe fatura para esta data
          const [existingInvoice] = await pool.query(
            `SELECT id FROM invoices 
             WHERE client_id = ? 
             AND due_date = ?
             LIMIT 1`,
            [clientId, renewalDate]
          );

          if (existingInvoice.length > 0) {
            console.log(`   ⏭️  ${clientName}: Fatura já existe`);
            totalSkipped++;
            continue;
          }

          // Gerar descrição da fatura
          const renewalDateObj = new Date(renewalDate);
          const monthNames = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
          ];
          const month = monthNames[renewalDateObj.getMonth()];
          const year = renewalDateObj.getFullYear();
          const description = `Mensalidade - ${month} ${year}`;

          // Criar fatura
          const invoiceId = `inv_auto_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
          const issueDate = new Date().toISOString().split('T')[0];
          const discount = 0;
          const finalValue = value - discount;

          await pool.query(
            `INSERT INTO invoices 
             (id, reseller_id, client_id, issue_date, due_date, value, discount, final_value, status, description, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, NOW(), NOW())`,
            [invoiceId, resellerId, clientId, issueDate, renewalDate, value, discount, finalValue, description]
          );

          console.log(`   ✅ ${clientName}: Fatura gerada (Vencimento: ${renewalDate}, Valor: R$ ${value})`);
          totalGenerated++;

          // Enviar WhatsApp se cliente tem telefone
          if (client.phone) {
            // Verificar se já enviou WhatsApp para esta fatura
            const hasWhatsAppLog = await checkExistingWhatsAppLog(invoiceId);

            if (!hasWhatsAppLog) {
              // Buscar template de fatura
              const [templates] = await pool.query(
                `SELECT message 
                 FROM whatsapp_reminder_templates 
                 WHERE reseller_id = ? AND type = 'invoice' AND is_active = 1 
                 LIMIT 1`,
                [resellerId]
              );

              if (templates.length > 0) {
                const template = templates[0];
                const message = processMessageVariables(
                  template.message,
                  client,
                  renewalDate,
                  value,
                  planName
                );

                const result = await sendWhatsAppMessage(client.phone, message);

                if (result.success) {
                  await createWhatsAppLog(invoiceId, clientId, resellerId, formatPhone(client.phone), message, 'sent');
                  console.log(`      📱 WhatsApp enviado para ${clientName} (${client.phone})`);
                  totalWhatsAppSent++;
                } else {
                  await createWhatsAppLog(invoiceId, clientId, resellerId, client.phone, message, 'failed', result.error);
                  console.error(`      ❌ Falha ao enviar WhatsApp: ${result.error}`);
                  totalWhatsAppFailed++;
                }

                // Pequeno delay entre envios
                await new Promise(resolve => setTimeout(resolve, 1000));
              } else {
                console.log(`      ⚠️  Nenhum template de fatura encontrado`);
              }
            }
          }

        } catch (error) {
          console.error(`   ❌ Erro ao processar ${client.name}: ${error.message}`);
        }
      }
    }

    const duration = Date.now() - startTime;
    console.log(`\n✅ Processamento concluído em ${duration}ms`);
    console.log(`📊 Estatísticas:`);
    console.log(`   • Faturas geradas: ${totalGenerated}`);
    console.log(`   • Faturas já existentes: ${totalSkipped}`);
    console.log(`   • WhatsApp enviados: ${totalWhatsAppSent}`);
    console.log(`   • WhatsApp falharam: ${totalWhatsAppFailed}`);

    // Atualizar estatísticas globais
    stats.totalGenerated += totalGenerated;
    stats.totalSkipped += totalSkipped;
    stats.totalWhatsAppSent += totalWhatsAppSent;
    stats.totalWhatsAppFailed += totalWhatsAppFailed;
    stats.lastProcessTime = new Date();

  } catch (error) {
    console.error('❌ Erro no processamento:', error);
  }
}

/**
 * Iniciar serviço
 */
async function start() {
  console.log('🚀 Iniciando Processador de Faturas WhatsApp');
  console.log('================================================');
  console.log(`📅 Data/Hora: ${new Date().toLocaleString()}`);
  console.log(`🗄️  Banco: ${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}`);
  console.log(`📱 WhatsApp: ${WHATSAPP_API_URL}`);
  console.log(`⏰ Gerar faturas ${DAYS_BEFORE_EXPIRY} dias antes do vencimento`);
  console.log('');

  // Inicializar banco
  const dbConnected = await initDatabase();

  if (!dbConnected) {
    console.error('❌ Não foi possível conectar ao banco de dados. Encerrando...');
    process.exit(1);
  }

  // Processar imediatamente
  await processInvoices();

  // Configurar intervalo (a cada 1 hora por padrão)
  const intervalMinutes = parseInt(process.env.CHECK_INTERVAL_MINUTES || '60');
  const intervalMs = intervalMinutes * 60 * 1000;

  console.log(`\n⏰ Agendado para verificar a cada ${intervalMinutes} minuto(s)`);
  console.log('💡 Pressione Ctrl+C para encerrar\n');

  setInterval(processInvoices, intervalMs);

  // Endpoint de status (opcional)
  const express = require('express');
  const app = express();
  const statusPort = process.env.INVOICE_STATUS_PORT || 3004;

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      uptime: Math.floor((Date.now() - stats.startTime.getTime()) / 1000),
      stats: {
        ...stats,
        startTime: stats.startTime.toISOString(),
        lastProcessTime: stats.lastProcessTime ? stats.lastProcessTime.toISOString() : null,
      }
    });
  });

  app.get('/stats', (_req, res) => {
    res.json(stats);
  });

  app.listen(statusPort, () => {
    console.log(`📊 Status endpoint: http://localhost:${statusPort}/health`);
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n🔄 Encerrando graciosamente...');
  if (pool) {
    await pool.end();
  }
  console.log('✅ Encerrado');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n🔄 Encerrando graciosamente...');
  if (pool) {
    await pool.end();
  }
  console.log('✅ Encerrado');
  process.exit(0);
});

// Iniciar
start().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
