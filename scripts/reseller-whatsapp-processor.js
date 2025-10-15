/**
 * Reseller WhatsApp Processor
 * Envia mensagens WhatsApp automáticas para revendedores
 * baseado nos templates configurados
 */

const mysql = require('mysql2/promise');
const http = require('http');
const axios = require('axios');
require('dotenv').config();

// Configuração
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'iptv_manager',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'http://localhost:3002';
const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY || 'UltraGestor-api-key-2024';
const ADMIN_INSTANCE = 'admin_whatsapp'; // Instância do WhatsApp do admin

let pool;

/**
 * Inicializar banco de dados
 */
async function initializeDatabase() {
  try {
    pool = mysql.createPool(dbConfig);
    console.log('✅ Conexão com banco de dados estabelecida');
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar ao banco de dados:', error.message);
    return false;
  }
}

/**
 * Enviar mensagem WhatsApp
 */
async function sendWhatsAppMessage(phone, message) {
  try {
    // Formatar número (remover caracteres especiais e adicionar código do país)
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

    const response = await axios.post(
      `${WHATSAPP_API_URL}/message/sendText/${ADMIN_INSTANCE}`,
      {
        number: formattedPhone,
        text: message
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'apikey': WHATSAPP_API_KEY
        },
        timeout: 30000
      }
    );

    return { success: true, data: response.data };
  } catch (error) {
    console.error(`   ❌ Erro ao enviar WhatsApp:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Substituir variáveis no template
 */
function replaceVariables(message, data) {
  let result = message;
  
  const variables = {
    '{{revenda_nome}}': data.display_name || 'Revendedor',
    '{{revenda_email}}': data.email || '',
    '{{plano_nome}}': data.plan_name || 'Plano',
    '{{valor}}': data.plan_price ? `${parseFloat(data.plan_price).toFixed(2)}` : '0,00',
    '{{data_vencimento}}': data.subscription_expiry_date ? 
      new Date(data.subscription_expiry_date).toLocaleDateString('pt-BR') : '',
    '{{link_renovacao}}': `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'}/dashboard/subscription`,
  };

  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(key, 'g'), value);
  }

  return result;
}

/**
 * Registrar log de envio
 */
async function logWhatsAppSend(resellerId, phone, message, triggerType, status, errorMessage = null) {
  try {
    const logId = `rwlog_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    
    await pool.query(`
      INSERT INTO reseller_whatsapp_logs
      (id, reseller_id, phone, message, trigger_type, status, error_message, sent_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `, [logId, resellerId, phone, message, triggerType, status, errorMessage]);
    
  } catch (error) {
    console.error('   ⚠️  Erro ao registrar log:', error.message);
  }
}

/**
 * Processar revendedores com assinatura expirando em 7 dias
 */
async function processExpiring7Days() {
  try {
    const [resellers] = await pool.query(`
      SELECT 
        r.id,
        r.email,
        r.display_name,
        r.phone,
        r.subscription_expiry_date,
        rsp.name as plan_name,
        rsp.price as plan_price,
        DATEDIFF(r.subscription_expiry_date, CURDATE()) as days_remaining
      FROM resellers r
      LEFT JOIN reseller_subscription_plans rsp ON r.subscription_plan_id = rsp.id
      WHERE r.is_active = TRUE
        AND r.phone IS NOT NULL
        AND r.phone != ''
        AND DATEDIFF(r.subscription_expiry_date, CURDATE()) = 7
        AND NOT EXISTS (
          SELECT 1 FROM reseller_whatsapp_logs rwl
          WHERE rwl.reseller_id = r.id
            AND rwl.trigger_type = 'expiring_7days'
            AND DATE(rwl.sent_at) = CURDATE()
        )
    `);

    if (resellers.length === 0) {
      return 0;
    }

    console.log(`📋 Encontrados ${resellers.length} revendedor(es) com assinatura vencendo em 7 dias`);

    // Buscar template
    const [templates] = await pool.query(`
      SELECT message FROM reseller_whatsapp_templates
      WHERE trigger_type = 'expiring_7days' AND is_active = TRUE
      LIMIT 1
    `);

    if (templates.length === 0) {
      console.log('   ⚠️  Template não encontrado');
      return 0;
    }

    let sentCount = 0;

    for (const reseller of resellers) {
      const message = replaceVariables(templates[0].message, reseller);
      
      console.log(`   📤 Enviando para ${reseller.display_name} (${reseller.phone})`);
      
      const result = await sendWhatsAppMessage(reseller.phone, message);
      
      await logWhatsAppSend(
        reseller.id,
        reseller.phone,
        message,
        'expiring_7days',
        result.success ? 'sent' : 'failed',
        result.error
      );

      if (result.success) {
        console.log(`   ✅ Enviado com sucesso`);
        sentCount++;
      }

      // Aguardar 2 segundos entre envios
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return sentCount;
  } catch (error) {
    console.error('❌ Erro ao processar vencimento 7 dias:', error.message);
    return 0;
  }
}

/**
 * Processar revendedores com assinatura expirando em 3 dias
 */
async function processExpiring3Days() {
  try {
    const [resellers] = await pool.query(`
      SELECT 
        r.id,
        r.email,
        r.display_name,
        r.phone,
        r.subscription_expiry_date,
        rsp.name as plan_name,
        rsp.price as plan_price,
        DATEDIFF(r.subscription_expiry_date, CURDATE()) as days_remaining
      FROM resellers r
      LEFT JOIN reseller_subscription_plans rsp ON r.subscription_plan_id = rsp.id
      WHERE r.is_active = TRUE
        AND r.phone IS NOT NULL
        AND r.phone != ''
        AND DATEDIFF(r.subscription_expiry_date, CURDATE()) = 3
        AND NOT EXISTS (
          SELECT 1 FROM reseller_whatsapp_logs rwl
          WHERE rwl.reseller_id = r.id
            AND rwl.trigger_type = 'expiring_3days'
            AND DATE(rwl.sent_at) = CURDATE()
        )
    `);

    if (resellers.length === 0) {
      return 0;
    }

    console.log(`📋 Encontrados ${resellers.length} revendedor(es) com assinatura vencendo em 3 dias`);

    const [templates] = await pool.query(`
      SELECT message FROM reseller_whatsapp_templates
      WHERE trigger_type = 'expiring_3days' AND is_active = TRUE
      LIMIT 1
    `);

    if (templates.length === 0) {
      console.log('   ⚠️  Template não encontrado');
      return 0;
    }

    let sentCount = 0;

    for (const reseller of resellers) {
      const message = replaceVariables(templates[0].message, reseller);
      
      console.log(`   📤 Enviando para ${reseller.display_name} (${reseller.phone})`);
      
      const result = await sendWhatsAppMessage(reseller.phone, message);
      
      await logWhatsAppSend(
        reseller.id,
        reseller.phone,
        message,
        'expiring_3days',
        result.success ? 'sent' : 'failed',
        result.error
      );

      if (result.success) {
        console.log(`   ✅ Enviado com sucesso`);
        sentCount++;
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return sentCount;
  } catch (error) {
    console.error('❌ Erro ao processar vencimento 3 dias:', error.message);
    return 0;
  }
}

/**
 * Processar revendedores com assinatura expirando em 1 dia
 */
async function processExpiring1Day() {
  try {
    const [resellers] = await pool.query(`
      SELECT 
        r.id,
        r.email,
        r.display_name,
        r.phone,
        r.subscription_expiry_date,
        rsp.name as plan_name,
        rsp.price as plan_price,
        DATEDIFF(r.subscription_expiry_date, CURDATE()) as days_remaining
      FROM resellers r
      LEFT JOIN reseller_subscription_plans rsp ON r.subscription_plan_id = rsp.id
      WHERE r.is_active = TRUE
        AND r.phone IS NOT NULL
        AND r.phone != ''
        AND DATEDIFF(r.subscription_expiry_date, CURDATE()) = 1
        AND NOT EXISTS (
          SELECT 1 FROM reseller_whatsapp_logs rwl
          WHERE rwl.reseller_id = r.id
            AND rwl.trigger_type = 'expiring_1day'
            AND DATE(rwl.sent_at) = CURDATE()
        )
    `);

    if (resellers.length === 0) {
      return 0;
    }

    console.log(`📋 Encontrados ${resellers.length} revendedor(es) com assinatura vencendo AMANHÃ`);

    const [templates] = await pool.query(`
      SELECT message FROM reseller_whatsapp_templates
      WHERE trigger_type = 'expiring_1day' AND is_active = TRUE
      LIMIT 1
    `);

    if (templates.length === 0) {
      console.log('   ⚠️  Template não encontrado');
      return 0;
    }

    let sentCount = 0;

    for (const reseller of resellers) {
      const message = replaceVariables(templates[0].message, reseller);
      
      console.log(`   📤 Enviando para ${reseller.display_name} (${reseller.phone})`);
      
      const result = await sendWhatsAppMessage(reseller.phone, message);
      
      await logWhatsAppSend(
        reseller.id,
        reseller.phone,
        message,
        'expiring_1day',
        result.success ? 'sent' : 'failed',
        result.error
      );

      if (result.success) {
        console.log(`   ✅ Enviado com sucesso`);
        sentCount++;
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return sentCount;
  } catch (error) {
    console.error('❌ Erro ao processar vencimento 1 dia:', error.message);
    return 0;
  }
}

/**
 * Processar revendedores com assinatura vencida
 */
async function processExpired() {
  try {
    const [resellers] = await pool.query(`
      SELECT 
        r.id,
        r.email,
        r.display_name,
        r.phone,
        r.subscription_expiry_date,
        rsp.name as plan_name,
        rsp.price as plan_price,
        DATEDIFF(CURDATE(), r.subscription_expiry_date) as days_expired
      FROM resellers r
      LEFT JOIN reseller_subscription_plans rsp ON r.subscription_plan_id = rsp.id
      WHERE r.is_active = TRUE
        AND r.phone IS NOT NULL
        AND r.phone != ''
        AND r.subscription_expiry_date < CURDATE()
        AND NOT EXISTS (
          SELECT 1 FROM reseller_whatsapp_logs rwl
          WHERE rwl.reseller_id = r.id
            AND rwl.trigger_type = 'expired'
            AND DATE(rwl.sent_at) = CURDATE()
        )
    `);

    if (resellers.length === 0) {
      return 0;
    }

    console.log(`📋 Encontrados ${resellers.length} revendedor(es) com assinatura VENCIDA`);

    const [templates] = await pool.query(`
      SELECT message FROM reseller_whatsapp_templates
      WHERE trigger_type = 'expired' AND is_active = TRUE
      LIMIT 1
    `);

    if (templates.length === 0) {
      console.log('   ⚠️  Template não encontrado');
      return 0;
    }

    let sentCount = 0;

    for (const reseller of resellers) {
      const message = replaceVariables(templates[0].message, reseller);
      
      console.log(`   📤 Enviando para ${reseller.display_name} (${reseller.phone})`);
      
      const result = await sendWhatsAppMessage(reseller.phone, message);
      
      await logWhatsAppSend(
        reseller.id,
        reseller.phone,
        message,
        'expired',
        result.success ? 'sent' : 'failed',
        result.error
      );

      if (result.success) {
        console.log(`   ✅ Enviado com sucesso`);
        sentCount++;
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return sentCount;
  } catch (error) {
    console.error('❌ Erro ao processar vencidos:', error.message);
    return 0;
  }
}

/**
 * Executar processamento
 */
async function runProcessor() {
  console.log('\n' + '='.repeat(60));
  console.log(`🔄 [${new Date().toLocaleString('pt-BR')}] Processando mensagens WhatsApp para revendedores...`);
  console.log('='.repeat(60));

  try {
    const expiring7 = await processExpiring7Days();
    const expiring3 = await processExpiring3Days();
    const expiring1 = await processExpiring1Day();
    const expired = await processExpired();

    console.log('\n' + '='.repeat(60));
    console.log('📊 Resumo do Processamento:');
    console.log(`   - Vencendo em 7 dias: ${expiring7} mensagens`);
    console.log(`   - Vencendo em 3 dias: ${expiring3} mensagens`);
    console.log(`   - Vencendo AMANHÃ: ${expiring1} mensagens`);
    console.log(`   - VENCIDAS: ${expired} mensagens`);
    console.log(`   - Total: ${expiring7 + expiring3 + expiring1 + expired} mensagens`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Erro no processamento:', error.message);
  }
}

/**
 * Health check endpoint
 */
function startHealthCheckServer() {
  const PORT = process.env.RESELLER_WHATSAPP_PROCESSOR_PORT || 3006;

  const server = http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        service: 'reseller-whatsapp-processor',
        timestamp: new Date().toISOString()
      }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(PORT, () => {
    console.log(`✅ Health check server rodando na porta ${PORT}`);
    console.log(`   Endpoint: http://localhost:${PORT}/health`);
  });
}

/**
 * Inicializar processador
 */
async function initialize() {
  console.log('🚀 Iniciando Reseller WhatsApp Processor...\n');

  const dbConnected = await initializeDatabase();
  if (!dbConnected) {
    console.error('❌ Falha ao conectar ao banco de dados. Encerrando...');
    process.exit(1);
  }

  // Iniciar servidor de health check
  startHealthCheckServer();

  // Executar imediatamente
  await runProcessor();

  // Executar a cada 1 hora
  const INTERVAL = 60 * 60 * 1000; // 1 hora
  setInterval(runProcessor, INTERVAL);

  console.log(`⏰ Processador configurado para executar a cada 1 hora\n`);
}

// Tratamento de erros
process.on('unhandledRejection', (error) => {
  console.error('❌ Erro não tratado:', error);
});

process.on('SIGINT', async () => {
  console.log('\n⚠️  Encerrando processador...');
  if (pool) {
    await pool.end();
  }
  process.exit(0);
});

// Iniciar
initialize();
