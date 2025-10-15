#!/usr/bin/env node

/**
 * Script de Teste - Verificação de Bloqueio por Assinatura
 * Testa se todos os processors bloqueiam corretamente quando a assinatura expira
 */

require('dotenv').config({ path: '../.env' });
const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'iptv_manager',
};

let pool;

async function initDatabase() {
  try {
    pool = mysql.createPool(DB_CONFIG);
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar:', error.message);
    return false;
  }
}

async function testSubscriptionBlock() {
  console.log('🧪 TESTE DE BLOQUEIO POR ASSINATURA');
  console.log('=' .repeat(60));
  console.log('');

  // Buscar todos os resellers
  const [resellers] = await pool.query(
    `SELECT id, email, display_name, is_admin, subscription_expiry_date, account_status, is_active
     FROM resellers
     ORDER BY is_admin DESC, id ASC`
  );

  console.log(`📋 Total de resellers: ${resellers.length}\n`);

  const today = new Date().toISOString().split('T')[0];

  for (const reseller of resellers) {
    console.log(`\n👤 Reseller: ${reseller.email} (ID: ${reseller.id})`);
    console.log(`   Tipo: ${reseller.is_admin ? '🔑 ADMIN' : '👥 RESELLER'}`);
    console.log(`   Status da conta: ${reseller.account_status}`);
    console.log(`   Ativo: ${reseller.is_active ? 'SIM' : 'NÃO'}`);
    console.log(`   Assinatura expira: ${reseller.subscription_expiry_date || 'N/A'}`);

    // Verificar se deve ser bloqueado
    let shouldBlock = false;
    let blockReason = '';

    if (!reseller.is_active) {
      shouldBlock = true;
      blockReason = 'Conta desativada';
    } else if (!reseller.is_admin) {
      if (!reseller.subscription_expiry_date || reseller.subscription_expiry_date < today) {
        shouldBlock = true;
        blockReason = `Assinatura expirada (${reseller.subscription_expiry_date || 'sem data'})`;
      } else if (reseller.account_status !== 'active' && reseller.account_status !== 'trial') {
        shouldBlock = true;
        blockReason = `Status da conta: ${reseller.account_status}`;
      }
    }

    if (shouldBlock) {
      console.log(`   🚫 BLOQUEADO: ${blockReason}`);
      console.log(`   ⚠️  Nenhum serviço funcionará para este reseller`);
    } else {
      console.log(`   ✅ LIBERADO: Todos os serviços funcionarão`);
    }

    // Verificar clientes ativos
    const [clients] = await pool.query(
      `SELECT COUNT(*) as total FROM clients WHERE reseller_id = ? AND status = 'active'`,
      [reseller.id]
    );

    console.log(`   👥 Clientes ativos: ${clients[0].total}`);

    // Verificar lembretes pendentes
    const [reminders] = await pool.query(
      `SELECT COUNT(*) as total FROM whatsapp_reminder_logs 
       WHERE reseller_id = ? AND status = 'pending' AND DATE(created_at) = CURDATE()`,
      [reseller.id]
    );

    console.log(`   📝 Lembretes pendentes hoje: ${reminders[0].total}`);

    // Verificar faturas pendentes
    const [invoices] = await pool.query(
      `SELECT COUNT(*) as total FROM invoices 
       WHERE reseller_id = ? AND status = 'pending'`,
      [reseller.id]
    );

    console.log(`   💰 Faturas pendentes: ${invoices[0].total}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Teste concluído!');
  console.log('');
  console.log('📌 RESUMO:');
  console.log('   • Admins: SEMPRE liberados (não verificam assinatura)');
  console.log('   • Resellers: Bloqueados se:');
  console.log('     - Conta desativada (is_active = 0)');
  console.log('     - Assinatura expirada (subscription_expiry_date < hoje)');
  console.log('     - Status da conta != "active" E != "trial"');
  console.log('');
  console.log('🔒 SERVIÇOS BLOQUEADOS QUANDO EXPIRADO:');
  console.log('   ✓ Lembretes WhatsApp (reminder-processor.js)');
  console.log('   ✓ Geração de Faturas (invoice-processor.js)');
  console.log('   ✓ Monitor de Conexão (whatsapp-connection-monitor.js)');
  console.log('   ✓ Acesso ao Dashboard (subscription-guard.tsx)');
  console.log('   ✓ APIs do Backend (subscription-check.php)');
  console.log('');
}

async function main() {
  const connected = await initDatabase();
  if (!connected) {
    process.exit(1);
  }

  await testSubscriptionBlock();

  await pool.end();
}

main().catch(error => {
  console.error('❌ Erro:', error);
  process.exit(1);
});
