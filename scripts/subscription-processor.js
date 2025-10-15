/**
 * Subscription Payment Processor
 * Verifica pagamentos de assinatura pendentes e expira automaticamente
 * Executa a cada 5 minutos
 */

const mysql = require('mysql2/promise');
const http = require('http');
require('dotenv').config();

// Configuração do banco de dados
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

let pool;

/**
 * Inicializar pool de conexões
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
 * Processar pagamentos expirados
 */
async function processExpiredPayments() {
  try {
    // Buscar pagamentos pendentes que expiraram
    const [payments] = await pool.query(`
      SELECT id, reseller_id, plan_id, amount, expires_at
      FROM reseller_payment_history
      WHERE status = 'pending' AND expires_at < NOW()
    `);

    if (payments.length === 0) {
      console.log('✅ Nenhum pagamento expirado encontrado');
      return 0;
    }

    console.log(`📋 Encontrados ${payments.length} pagamento(s) expirado(s)`);

    let expiredCount = 0;

    for (const payment of payments) {
      try {
        // Marcar como cancelado
        await pool.query(`
          UPDATE reseller_payment_history
          SET status = 'cancelled',
              notes = CONCAT(COALESCE(notes, ''), ' - Expirado automaticamente em ', NOW())
          WHERE id = ?
        `, [payment.id]);

        console.log(`   ❌ Pagamento ${payment.id} expirado`);
        expiredCount++;
      } catch (error) {
        console.error(`   ⚠️  Erro ao expirar pagamento ${payment.id}:`, error.message);
      }
    }

    console.log(`✅ Total de pagamentos expirados: ${expiredCount}`);
    return expiredCount;

  } catch (error) {
    console.error('❌ Erro ao processar pagamentos expirados:', error.message);
    return 0;
  }
}

/**
 * Verificar assinaturas próximas do vencimento
 */
async function checkExpiringSubscriptions() {
  try {
    // Buscar revendas com assinatura vencendo em 7 dias
    const [resellers] = await pool.query(`
      SELECT 
        r.id,
        r.email,
        r.display_name,
        r.subscription_expiry_date,
        DATEDIFF(r.subscription_expiry_date, CURDATE()) as days_remaining
      FROM resellers r
      WHERE r.subscription_expiry_date IS NOT NULL
        AND DATEDIFF(r.subscription_expiry_date, CURDATE()) IN (7, 3, 1)
        AND r.is_active = TRUE
    `);

    if (resellers.length === 0) {
      return 0;
    }

    console.log(`📋 Encontrados ${resellers.length} revenda(s) com assinatura próxima do vencimento`);

    let notificationCount = 0;

    for (const reseller of resellers) {
      try {
        // Verificar se já foi criada notificação hoje
        const [existing] = await pool.query(`
          SELECT id FROM notifications
          WHERE reseller_id = ?
            AND type = 'system'
            AND DATE(created_at) = CURDATE()
            AND message LIKE '%vence em%dias%'
        `, [reseller.id]);

        if (existing.length > 0) {
          continue; // Já notificou hoje
        }

        // Criar notificação
        const notificationId = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        const message = `Sua assinatura vence em ${reseller.days_remaining} dia(s). Renove agora para manter seu acesso!`;

        await pool.query(`
          INSERT INTO notifications 
          (id, reseller_id, type, title, message, priority, is_read, created_at)
          VALUES (?, ?, 'system', 'Assinatura próxima do vencimento', ?, 'high', FALSE, NOW())
        `, [notificationId, reseller.id, message]);

        console.log(`   🔔 Notificação criada para ${reseller.email} (${reseller.days_remaining} dias)`);
        notificationCount++;

      } catch (error) {
        console.error(`   ⚠️  Erro ao criar notificação para ${reseller.email}:`, error.message);
      }
    }

    console.log(`✅ Total de notificações criadas: ${notificationCount}`);
    return notificationCount;

  } catch (error) {
    console.error('❌ Erro ao verificar assinaturas:', error.message);
    return 0;
  }
}

/**
 * Executar processamento
 */
async function runProcessor() {
  console.log('\n' + '='.repeat(60));
  console.log(`🔄 [${new Date().toLocaleString('pt-BR')}] Iniciando processamento...`);
  console.log('='.repeat(60));

  try {
    // Processar pagamentos expirados
    const expiredCount = await processExpiredPayments();

    // Verificar assinaturas próximas do vencimento
    const notificationCount = await checkExpiringSubscriptions();

    console.log('\n' + '='.repeat(60));
    console.log('📊 Resumo do Processamento:');
    console.log(`   - Pagamentos expirados: ${expiredCount}`);
    console.log(`   - Notificações criadas: ${notificationCount}`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Erro no processamento:', error.message);
  }
}

/**
 * Health check endpoint
 */
function startHealthCheckServer() {
  const PORT = process.env.SUBSCRIPTION_PROCESSOR_PORT || 3005;

  const server = http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        service: 'subscription-processor',
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
  console.log('🚀 Iniciando Subscription Payment Processor...\n');

  const dbConnected = await initializeDatabase();
  if (!dbConnected) {
    console.error('❌ Falha ao conectar ao banco de dados. Encerrando...');
    process.exit(1);
  }

  // Iniciar servidor de health check
  startHealthCheckServer();

  // Executar imediatamente
  await runProcessor();

  // Executar a cada 5 minutos
  const INTERVAL = 5 * 60 * 1000; // 5 minutos
  setInterval(runProcessor, INTERVAL);

  console.log(`⏰ Processador configurado para executar a cada 5 minutos\n`);
}

// Tratamento de erros não capturados
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
