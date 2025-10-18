#!/usr/bin/env node

/**
 * Processador Automático de Lembretes WhatsApp
 * Roda independente do frontend, processando lembretes 24/7
 */

// Carregar variáveis de ambiente do arquivo .env
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

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

// Estatísticas
const stats = {
  totalProcessed: 0,
  totalSent: 0,
  totalFailed: 0,
  lastProcessTime: null,
  startTime: new Date()
};

// Cache de status de conexão para detectar mudanças
const connectionStatusCache = new Map();

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

  // Validar formato
  if (number.length === 11 || number.length === 10) {
    return '55' + number;
  }

  return cleaned;
}

/**
 * Processar variáveis na mensagem
 * Suporta tanto {variavel} quanto {{variavel}}
 */
function processMessageVariables(message, client, daysUntilDue, additionalData = {}) {
  let processed = message;

  // Preparar dados
  // Parsear data como local (não UTC) para evitar problemas de timezone
  let renewalDate;
  if (typeof client.renewal_date === 'string') {
    const [year, month, day] = client.renewal_date.split('-').map(Number);
    renewalDate = new Date(year, month - 1, day); // month - 1 porque JS usa 0-11
  } else {
    // Já é um objeto Date do MySQL
    renewalDate = new Date(client.renewal_date);
  }
  const now = new Date();
  const clientValue = parseFloat(client.value) || 0;
  const discountValue = parseFloat(additionalData.discountValue) || 0;
  const finalValue = parseFloat(additionalData.finalValue) || clientValue;
  const horaAtual = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  const statusMap = {
    'active': 'Ativo',
    'inactive': 'Inativo',
    'suspended': 'Suspenso',
    'cancelled': 'Cancelado'
  };
  const statusCliente = statusMap[client.status] || client.status || 'Ativo';

  // Formatar data por extenso
  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const dataVencimentoExtenso = `${renewalDate.getDate()} de ${meses[renewalDate.getMonth()]} de ${renewalDate.getFullYear()}`;

  // Texto de dias restantes
  const diasAbs = Math.abs(daysUntilDue);
  let diasRestantesTexto;
  if (daysUntilDue > 0) {
    diasRestantesTexto = diasAbs === 1 ? 'em 1 dia' : `em ${diasAbs} dias`;
  } else if (daysUntilDue === 0) {
    diasRestantesTexto = 'hoje';
  } else {
    diasRestantesTexto = diasAbs === 1 ? 'há 1 dia' : `há ${diasAbs} dias`;
  }

  // Mapa de variáveis e seus valores
  const variables = {
    // Cliente
    'CLIENT_NAME': client.name || '',
    'cliente_nome': client.name || '',
    'CLIENT_PHONE': client.phone || '',
    'cliente_telefone': client.phone || '',
    'USERNAME': client.username || '',
    'cliente_usuario': client.username || '',

    // Datas
    'DUE_DATE': renewalDate.toLocaleDateString('pt-BR'),
    'data_vencimento': renewalDate.toLocaleDateString('pt-BR'),
    'data_vencimento_extenso': dataVencimentoExtenso,
    'DAYS_UNTIL_DUE': Math.abs(daysUntilDue).toString(),
    'dias_restantes': Math.abs(daysUntilDue).toString(),
    'dias_restantes_texto': diasRestantesTexto,
    'ano_vencimento': renewalDate.getFullYear().toString(),
    'mes_vencimento': meses[renewalDate.getMonth()],
    'CURRENT_DATE': now.toLocaleDateString('pt-BR'),
    'data_hoje': now.toLocaleDateString('pt-BR'),
    'data_atual': now.toLocaleDateString('pt-BR'),
    'hora_atual': horaAtual,

    // Valores
    'AMOUNT': clientValue.toFixed(2).replace('.', ','),
    'valor': clientValue.toFixed(2).replace('.', ','),
    'valor_numerico': clientValue.toFixed(2),
    'DISCOUNT_VALUE': discountValue.toFixed(2).replace('.', ','),
    'desconto': discountValue.toFixed(2).replace('.', ','),
    'FINAL_VALUE': finalValue.toFixed(2).replace('.', ','),
    'valor_final': finalValue.toFixed(2).replace('.', ','),

    // Plano/Sistema
    'PLAN_NAME': additionalData.planName || 'Plano',
    'plano': additionalData.planName || 'Plano',
    'plano_nome': additionalData.planName || 'Plano',
    'status_cliente': statusCliente,
    'CLIENT_STATUS': statusCliente,
    'BUSINESS_NAME': 'GestPlay',
    'empresa_nome': 'GestPlay',
    
    // Link de pagamento
    'link_pagamento': additionalData.paymentLink || 'Link não disponível',
    'link_fatura': additionalData.paymentLink || 'Link não disponível',
    'PAYMENT_LINK': additionalData.paymentLink || 'Link não disponível',
  };

  // Substituir todas as variáveis (suporta {var} e {{var}})
  Object.keys(variables).forEach(key => {
    const value = variables[key];
    // Substituir {{variavel}} e {variavel} (case insensitive)
    processed = processed.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'gi'), value);
    processed = processed.replace(new RegExp(`\\{${key}\\}`, 'gi'), value);
  });

  return processed;
}

/**
 * Extrair ID numérico do reseller_id
 */
function extractNumericId(resellerId) {
  // Se já começa com "reseller_", remover
  let cleanId = resellerId.startsWith('reseller_') 
    ? resellerId.replace('reseller_', '') 
    : resellerId;
  
  // Extrair apenas números do início (antes de qualquer underscore ou caractere não numérico)
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
 * Enviar mensagem via WhatsApp usando instância da revenda
 */
async function sendWhatsAppMessage(phone, message, resellerId) {
  try {
    const formattedPhone = formatPhone(phone);

    if (!formattedPhone) {
      throw new Error('Telefone inválido');
    }

    // Extrair ID numérico e criar nome da instância
    const numericId = extractNumericId(resellerId);
    const instanceName = `reseller_${numericId}`;
    
    console.log(`      🔧 Usando instância: ${instanceName} (de ${resellerId})`);

    const response = await fetch(
      `${WHATSAPP_API_URL}/message/sendText/${instanceName}`,
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
 * Verificar se já existe log para este lembrete HOJE
 */
async function checkExistingLog(clientId, templateId) {
  try {
    const [rows] = await pool.query(
      `SELECT id, status FROM whatsapp_reminder_logs 
       WHERE client_id = ? 
       AND template_id = ? 
       AND DATE(created_at) = CURDATE()
       LIMIT 1`,
      [clientId, templateId]
    );

    if (rows.length === 0) {
      return false;
    }

    // Se existe um log com status 'sent', já foi enviado
    // Se existe um log com status 'pending' ou 'failed', ainda pode tentar enviar
    const log = rows[0];
    return log.status === 'sent';
  } catch (error) {
    console.error('Erro ao verificar log existente:', error);
    return false;
  }
}

/**
 * Reprocessar lembretes pendentes quando WhatsApp conectar
 */
async function reprocessPendingReminders(resellerId) {
  try {
    console.log(`🔄 [${resellerId}] Verificando lembretes pendentes...`);

    // Buscar logs pendentes ou falhados de hoje
    const [pendingLogs] = await pool.query(
      `SELECT wrl.*, c.name as client_name, c.phone, wt.name as template_name, wt.message
       FROM whatsapp_reminder_logs wrl
       JOIN clients c ON wrl.client_id = c.id
       JOIN whatsapp_templates wt ON wrl.template_id = wt.id
       WHERE wrl.reseller_id = ? 
       AND wrl.status IN ('pending', 'failed')
       AND DATE(wrl.created_at) = CURDATE()
       AND wrl.retry_count < 3
       ORDER BY wrl.created_at ASC`,
      [resellerId]
    );

    if (pendingLogs.length === 0) {
      console.log(`   ✅ Nenhum lembrete pendente para reprocessar`);
      return;
    }

    console.log(`   📋 Encontrados ${pendingLogs.length} lembretes pendentes para reprocessar`);

    let reprocessed = 0;
    let failed = 0;

    for (const log of pendingLogs) {
      console.log(`   📤 Reenviando: ${log.client_name} - ${log.template_name}`);

      // Tentar enviar novamente
      const result = await sendWhatsAppMessage(log.phone, log.message_content, resellerId);

      if (result.success) {
        await updateLogStatus(log.id, 'sent', null, result.messageId);
        console.log(`   ✅ Reenviado com sucesso para ${log.client_name}`);
        reprocessed++;
      } else {
        // Incrementar contador de tentativas
        await pool.query(
          `UPDATE whatsapp_reminder_logs 
           SET retry_count = retry_count + 1, error_message = ?, updated_at = NOW()
           WHERE id = ?`,
          [result.error, log.id]
        );
        console.log(`   ❌ Falha ao reenviar para ${log.client_name}: ${result.error}`);
        failed++;
      }

      // Pequeno delay entre reenvios
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`   📊 Reprocessamento concluído: ${reprocessed} enviados, ${failed} falharam`);
  } catch (error) {
    console.error(`❌ Erro ao reprocessar lembretes pendentes:`, error);
  }
}

/**
 * Criar log de lembrete
 */
async function createReminderLog(clientId, templateId, message, scheduledDate, resellerId, eventId = null) {
  try {
    const logId = `log_reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await pool.query(
      `INSERT INTO whatsapp_reminder_logs 
       (id, reseller_id, client_id, template_id, message_content, scheduled_date, status, event_id)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [logId, resellerId, clientId, templateId, message, scheduledDate, eventId]
    );

    return logId;
  } catch (error) {
    console.error('Erro ao criar log:', error);
    return null;
  }
}

/**
 * Atualizar status do log
 */
async function updateLogStatus(logId, status, errorMessage = null, whatsappMessageId = null) {
  try {
    const updates = ['status = ?'];
    const params = [status];

    if (errorMessage) {
      updates.push('error_message = ?');
      params.push(errorMessage);
    }

    if (whatsappMessageId) {
      updates.push('whatsapp_message_id = ?');
      params.push(whatsappMessageId);
    }

    if (status === 'sent') {
      updates.push('sent_at = NOW()');
    }

    params.push(logId);

    await pool.query(
      `UPDATE whatsapp_reminder_logs SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
  } catch (error) {
    console.error('Erro ao atualizar log:', error);
  }
}

/**
 * Verificar se está dentro do horário de trabalho
 */
function isWithinWorkingHours(settings, date = new Date()) {
  const hour = date.getHours();

  // Operação 24h
  if (settings.start_hour === 0 && settings.end_hour === 0) {
    return true;
  }

  return hour >= settings.start_hour && hour < settings.end_hour;
}

/**
 * Verificar se é dia de trabalho
 */
function isWorkingDay(settings, date = new Date()) {
  const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay();
  const workingDays = settings.working_days.split(',').map(d => parseInt(d.trim()));

  return workingDays.includes(dayOfWeek);
}

/**
 * Verificar e criar lembretes perdidos (que deveriam ter sido enviados hoje mas não foram)
 */
async function checkMissedReminders() {
  try {
    console.log(`\n🔍 [${new Date().toLocaleString()}] Verificando lembretes perdidos...`);

    // Buscar resellers ativos
    const [resellers] = await pool.query(
      `SELECT DISTINCT reseller_id FROM whatsapp_reminder_settings WHERE is_enabled = 1`
    );

    for (const reseller of resellers) {
      const resellerId = reseller.reseller_id;

      // Verificar se WhatsApp está conectado
      const connectionStatus = await checkWhatsAppConnection(resellerId);
      if (!connectionStatus.connected) {
        continue;
      }

      // Buscar templates ativos de lembretes agendados
      const [templates] = await pool.query(
        `SELECT * FROM whatsapp_templates 
         WHERE reseller_id = ? AND is_active = 1 AND trigger_event = 'scheduled'`,
        [resellerId]
      );

      // Buscar clientes que deveriam ter recebido lembretes hoje mas não receberam
      const [clients] = await pool.query(
        `SELECT c.*, p.name as plan_name 
         FROM clients c
         LEFT JOIN plans p ON c.plan_id = p.id
         WHERE c.reseller_id = ? AND c.status = 'active'`,
        [resellerId]
      );

      const now = new Date();
      const todayString = now.toISOString().split('T')[0];

      for (const client of clients) {
        // Calcular dias até vencimento
        let renewalDate;
        if (typeof client.renewal_date === 'string') {
          const [year, month, day] = client.renewal_date.split('-').map(Number);
          renewalDate = new Date(year, month - 1, day);
        } else {
          renewalDate = new Date(client.renewal_date);
        }
        
        const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const renewalDateOnly = new Date(renewalDate.getFullYear(), renewalDate.getMonth(), renewalDate.getDate());
        const daysUntilDue = Math.floor((renewalDateOnly - todayDate) / (1000 * 60 * 60 * 24));

        for (const template of templates) {
          // Verificar se é o dia certo para este template
          if (daysUntilDue !== template.days_offset) {
            continue;
          }

          // Verificar se já existe log para hoje
          const [existingLogs] = await pool.query(
            `SELECT id, status FROM whatsapp_reminder_logs 
             WHERE client_id = ? AND template_id = ? AND DATE(created_at) = CURDATE()`,
            [client.id, template.id]
          );

          // Se não existe log nenhum, criar um pendente
          if (existingLogs.length === 0) {
            console.log(`📝 Criando lembrete perdido: ${client.name} - ${template.name}`);

            // Processar mensagem
            let paymentLink = null;
            try {
              const [invoices] = await pool.query(
                `SELECT payment_link FROM invoices 
                 WHERE client_id = ? AND due_date = ? AND status = 'pending'
                 ORDER BY created_at DESC LIMIT 1`,
                [client.id, client.renewal_date]
              );
              if (invoices.length > 0 && invoices[0].payment_link) {
                paymentLink = invoices[0].payment_link;
              }
            } catch (error) {
              console.error('Erro ao buscar link de pagamento:', error);
            }

            const message = processMessageVariables(
              template.message,
              client,
              daysUntilDue,
              {
                planName: client.plan_name,
                discountValue: 0,
                finalValue: client.value,
                paymentLink: paymentLink
              }
            );

            // Criar log pendente
            const logId = await createReminderLog(
              client.id,
              template.id,
              message,
              todayString,
              resellerId
            );

            if (logId) {
              console.log(`✅ Lembrete perdido criado: ${client.name} - ${template.name}`);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Erro ao verificar lembretes perdidos:', error);
  }
}

/**
 * Processar lembretes
 */
async function processReminders() {
  const startTime = Date.now();
  console.log(`\n🔄 [${new Date().toLocaleString()}] Iniciando processamento de lembretes...`);

  try {
    // Buscar configurações de cada reseller
    const [resellers] = await pool.query(
      `SELECT DISTINCT reseller_id FROM whatsapp_reminder_settings WHERE is_enabled = 1`
    );

    if (resellers.length === 0) {
      console.log('⚠️  Nenhum reseller com sistema de lembretes ativo');
      return;
    }

    let totalProcessed = 0;
    let totalSent = 0;
    let totalFailed = 0;

    for (const reseller of resellers) {
      const resellerId = reseller.reseller_id;

      // Verificar se a assinatura do reseller está ativa
      const [resellerData] = await pool.query(
        `SELECT is_admin, subscription_expiry_date, account_status 
         FROM resellers 
         WHERE id = ?`,
        [resellerId]
      );

      if (resellerData.length === 0) {
        console.log(`⚠️  Reseller ${resellerId}: Não encontrado no banco`);
        continue;
      }

      const resellerInfo = resellerData[0];

      // Admin sempre tem acesso
      if (!resellerInfo.is_admin) {
        // Verificar se a assinatura está ativa
        const expiryDate = resellerInfo.subscription_expiry_date;
        const today = new Date().toISOString().split('T')[0];

        if (!expiryDate || expiryDate < today) {
          console.log(`🚫 Reseller ${resellerId}: Assinatura expirada (${expiryDate || 'sem data'}), pulando processamento`);
          continue;
        }

        if (resellerInfo.account_status !== 'active' && resellerInfo.account_status !== 'trial') {
          console.log(`🚫 Reseller ${resellerId}: Conta inativa (${resellerInfo.account_status}), pulando processamento`);
          continue;
        }
      }

      // Buscar configurações do reseller
      const [settingsRows] = await pool.query(
        `SELECT * FROM whatsapp_reminder_settings WHERE reseller_id = ?`,
        [resellerId]
      );

      if (settingsRows.length === 0) continue;

      const settings = settingsRows[0];
      const now = new Date();

      // Verificar horário global
      const globalCanSend = isWithinWorkingHours(settings, now) && isWorkingDay(settings, now);

      // Verificar se WhatsApp está conectado para este reseller
      const connectionStatus = await checkWhatsAppConnection(resellerId);
      const previousStatus = connectionStatusCache.get(resellerId);
      
      // Atualizar cache de status
      connectionStatusCache.set(resellerId, connectionStatus.connected);
      
      if (connectionStatus.connected) {
        // Se WhatsApp acabou de se conectar (mudança de status), reprocessar lembretes pendentes
        if (previousStatus === false || previousStatus === undefined) {
          console.log(`🔄 Reseller ${resellerId}: WhatsApp reconectado, reprocessando lembretes pendentes...`);
          await reprocessPendingReminders(resellerId);
        }
      } else {
        console.log(`📱 Reseller ${resellerId}: WhatsApp desconectado (${connectionStatus.state}), pulando processamento`);
        continue;
      }

      // Buscar templates ativos (nova tabela unificada)
      const [templates] = await pool.query(
        `SELECT * FROM whatsapp_templates 
         WHERE reseller_id = ? AND is_active = 1 AND trigger_event = 'scheduled'`,
        [resellerId]
      );

      if (templates.length === 0) continue;

      console.log(`📋 Reseller ${resellerId}: ${templates.length} templates ativos`);

      // Buscar clientes ativos
      const [clients] = await pool.query(
        `SELECT c.*, p.name as plan_name 
         FROM clients c
         LEFT JOIN plans p ON c.plan_id = p.id
         WHERE c.reseller_id = ? AND c.status = 'active'`,
        [resellerId]
      );

      console.log(`👥 Reseller ${resellerId}: ${clients.length} clientes ativos`);

      const todayString = now.toISOString().split('T')[0];

      // Processar cada cliente
      for (const client of clients) {
        // Parsear data como local (não UTC) para evitar problemas de timezone
        let renewalDate;
        if (typeof client.renewal_date === 'string') {
          const [year, month, day] = client.renewal_date.split('-').map(Number);
          renewalDate = new Date(year, month - 1, day); // month - 1 porque JS usa 0-11
        } else {
          // Já é um objeto Date do MySQL
          renewalDate = new Date(client.renewal_date);
        }
        
        const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const renewalDateOnly = new Date(renewalDate.getFullYear(), renewalDate.getMonth(), renewalDate.getDate());

        // Calcular dias até vencimento (mesmo cálculo do MySQL DATEDIFF)
        const daysUntilDue = Math.floor((renewalDateOnly - todayDate) / (1000 * 60 * 60 * 24));

        console.log(`\n   👤 Cliente: ${client.name}`);
        console.log(`      📅 Vencimento: ${client.renewal_date}`);
        console.log(`      ⏰ Dias até vencer: ${daysUntilDue}`);

        // Processar cada template
        for (const template of templates) {
          // Verificar se é o dia certo para enviar
          // Template com days_offset positivo = antes do vencimento
          // Template com days_offset 0 = no dia do vencimento
          // Template com days_offset negativo = após o vencimento
          const shouldSend = (daysUntilDue === template.days_offset);

          console.log(`      📝 Template: ${template.name} (offset: ${template.days_offset})`);
          console.log(`         Deve enviar? ${shouldSend ? 'SIM' : 'NÃO'} (${daysUntilDue} === ${template.days_offset})`);

          if (!shouldSend) continue;

          // Verificar horário de envio
          let canSendNow = false;

          if (template.use_global_schedule) {
            canSendNow = globalCanSend;
            console.log(`         Horário global: ${canSendNow ? 'OK' : 'FORA DO HORÁRIO'}`);
          } else if (template.send_hour !== null) {
            // MODO SIMPLIFICADO: Ignora horário específico, sempre envia se for o dia certo
            // A verificação de duplicatas (checkExistingLog) garante que envia apenas 1x por dia
            canSendNow = isWorkingDay(settings, now);
            console.log(`         Dia útil: ${canSendNow ? 'SIM' : 'NÃO'}`);
          } else {
            canSendNow = globalCanSend;
            console.log(`         Horário global (fallback): ${canSendNow ? 'OK' : 'FORA DO HORÁRIO'}`);
          }

          if (!canSendNow) {
            console.log(`         ⏭️  Pulando: fora do horário de envio`);
            continue;
          }

          // ✅ VERIFICAR CONEXÃO DO WHATSAPP PRIMEIRO
          const connectionStatus = await checkWhatsAppConnection(resellerId);
          console.log(`         WhatsApp conectado? ${connectionStatus.connected ? 'SIM' : 'NÃO'} (${connectionStatus.state})`);

          if (!connectionStatus.connected) {
            console.log(`         ⏭️  Pulando: WhatsApp desconectado (${connectionStatus.error || connectionStatus.state})`);
            continue;
          }

          // ✅ VERIFICAR SE JÁ FOI ENVIADO HOJE (evita duplicatas)
          const hasExistingLog = await checkExistingLog(client.id, template.id);
          console.log(`         Já enviou hoje? ${hasExistingLog ? 'SIM' : 'NÃO'}`);

          if (hasExistingLog) {
            // Já enviou hoje, pular
            console.log(`         ⏭️  Pulando: já enviado hoje`);
            continue;
          }

          totalProcessed++;

          // Buscar link de pagamento da fatura (se existir)
          let paymentLink = null;
          try {
            const [invoices] = await pool.query(
              `SELECT payment_link FROM invoices 
               WHERE client_id = ? AND due_date = ? AND status = 'pending'
               ORDER BY created_at DESC LIMIT 1`,
              [client.id, client.renewal_date]
            );
            if (invoices.length > 0 && invoices[0].payment_link) {
              paymentLink = invoices[0].payment_link;
            }
          } catch (error) {
            console.error('Erro ao buscar link de pagamento:', error);
          }

          // Processar mensagem
          const message = processMessageVariables(
            template.message,
            client,
            daysUntilDue,
            {
              planName: client.plan_name,
              discountValue: 0,
              finalValue: client.value,
              paymentLink: paymentLink
            }
          );

          // Criar log APENAS se WhatsApp estiver conectado
          const logId = await createReminderLog(
            client.id,
            template.id,
            message,
            todayString,
            resellerId
          );

          if (!logId) {
            console.error(`❌ Erro ao criar log para ${client.name}`);
            totalFailed++;
            continue;
          }

          // Enviar mensagem
          const result = await sendWhatsAppMessage(client.phone, message, resellerId);

          if (result.success) {
            await updateLogStatus(logId, 'sent', null, result.messageId);
            console.log(`✅ Enviado para ${client.name} (${client.phone}) - Template: ${template.name}`);
            totalSent++;
          } else {
            await updateLogStatus(logId, 'failed', result.error);
            console.error(`❌ Falha ao enviar para ${client.name}: ${result.error}`);
            totalFailed++;
          }

          // Pequeno delay entre envios
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    const duration = Date.now() - startTime;
    console.log(`\n✅ Processamento concluído em ${duration}ms`);
    console.log(`📊 Estatísticas: ${totalProcessed} processados, ${totalSent} enviados, ${totalFailed} falharam`);

    // Atualizar estatísticas globais
    stats.totalProcessed += totalProcessed;
    stats.totalSent += totalSent;
    stats.totalFailed += totalFailed;
    stats.lastProcessTime = new Date();

  } catch (error) {
    console.error('❌ Erro no processamento:', error);
  }
}

/**
 * Iniciar serviço
 */
async function start() {
  console.log('🚀 Iniciando Processador de Lembretes WhatsApp');
  console.log('================================================');
  console.log(`📅 Data/Hora: ${new Date().toLocaleString()}`);
  console.log(`🗄️  Banco: ${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}`);
  console.log(`📱 WhatsApp: ${WHATSAPP_API_URL}`);
  console.log('');

  // Inicializar banco
  const dbConnected = await initDatabase();

  if (!dbConnected) {
    console.error('❌ Não foi possível conectar ao banco de dados. Encerrando...');
    process.exit(1);
  }

  // Verificar lembretes perdidos primeiro
  await checkMissedReminders();

  // Processar imediatamente
  await processReminders();

  // Configurar intervalo (a cada 1 minuto)
  const intervalMinutes = parseInt(process.env.CHECK_INTERVAL_MINUTES || '1');
  const intervalMs = intervalMinutes * 60 * 1000;

  console.log(`\n⏰ Agendado para verificar a cada ${intervalMinutes} minuto(s)`);
  console.log('💡 Pressione Ctrl+C para encerrar\n');

  setInterval(async () => {
    await checkMissedReminders();
    await processReminders();
  }, intervalMs);

  // Endpoint de status (opcional)
  const express = require('express');
  const app = express();
  const statusPort = process.env.REMINDER_STATUS_PORT || 3003;

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

  // Endpoint para reprocessar lembretes de um reseller específico
  app.post('/reprocess/:resellerId', async (req, res) => {
    const { resellerId } = req.params;
    
    try {
      console.log(`🔄 API: Reprocessando lembretes para ${resellerId}...`);
      
      // Verificar se WhatsApp está conectado
      const connectionStatus = await checkWhatsAppConnection(resellerId);
      if (!connectionStatus.connected) {
        return res.status(400).json({
          success: false,
          error: `WhatsApp não conectado para ${resellerId}`,
          state: connectionStatus.state
        });
      }

      // Reprocessar lembretes pendentes
      await reprocessPendingReminders(resellerId);
      
      res.json({
        success: true,
        message: `Lembretes reprocessados para ${resellerId}`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error(`❌ Erro ao reprocessar via API:`, error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  app.listen(statusPort, () => {
    console.log(`📊 Status endpoint: http://localhost:${statusPort}/health`);
    console.log(`🔄 Reprocess endpoint: http://localhost:${statusPort}/reprocess/:resellerId`);
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
