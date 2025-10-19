-- ============================================================================
-- INSTALAÇÃO COMPLETA E ATUALIZADA - UltraGestor
-- Versão: 3.0 - COM TODAS AS TABELAS E COLUNAS
-- ============================================================================

-- Configurar charset da conexão para suportar emojis
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- Configurar charset do banco para suportar emojis
ALTER DATABASE ultragestor_db CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Desabilitar verificação de foreign keys temporariamente
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================================
-- TABELAS PRINCIPAIS
-- ============================================================================

-- Tabela de usuários/resellers
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(128) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'reseller') DEFAULT 'reseller',
  phone VARCHAR(20),
  whatsapp VARCHAR(20),
  photo_url VARCHAR(500),
  cpf_cnpj VARCHAR(18),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(2),
  zip_code VARCHAR(10),
  is_active BOOLEAN DEFAULT TRUE,
  is_admin BOOLEAN DEFAULT FALSE,
  trial_used BOOLEAN DEFAULT FALSE,
  account_status ENUM('active', 'trial', 'expired', 'suspended') DEFAULT 'trial',
  subscription_plan_id VARCHAR(36),
  subscription_expiry_date DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_is_active (is_active),
  INDEX idx_whatsapp (whatsapp),
  INDEX idx_account_status (account_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Alias para resellers (compatibilidade)
CREATE TABLE IF NOT EXISTS resellers (
  id VARCHAR(128) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'reseller') DEFAULT 'reseller',
  phone VARCHAR(20),
  whatsapp VARCHAR(20),
  photo_url VARCHAR(500),
  cpf_cnpj VARCHAR(18),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(2),
  zip_code VARCHAR(10),
  is_active BOOLEAN DEFAULT TRUE,
  is_admin BOOLEAN DEFAULT FALSE,
  trial_used BOOLEAN DEFAULT FALSE,
  account_status ENUM('active', 'trial', 'expired', 'suspended') DEFAULT 'trial',
  subscription_plan_id VARCHAR(36),
  subscription_expiry_date DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_is_active (is_active),
  INDEX idx_whatsapp (whatsapp),
  INDEX idx_account_status (account_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de painéis Sigma
CREATE TABLE IF NOT EXISTS panels (
  id VARCHAR(36) PRIMARY KEY,
  reseller_id VARCHAR(128) NOT NULL,
  name VARCHAR(255) NOT NULL,
  sigma_url VARCHAR(255),
  sigma_token TEXT,
  sigma_username VARCHAR(255),
  sigma_connected BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (reseller_id) REFERENCES resellers(id) ON DELETE CASCADE,
  INDEX idx_reseller_id (reseller_id),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de planos
CREATE TABLE IF NOT EXISTS plans (
  id VARCHAR(36) PRIMARY KEY,
  reseller_id VARCHAR(128) NOT NULL,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  duration_days INT NOT NULL DEFAULT 30,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (reseller_id) REFERENCES resellers(id) ON DELETE CASCADE,
  INDEX idx_reseller_id (reseller_id),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de clientes
CREATE TABLE IF NOT EXISTS clients (
  id VARCHAR(36) PRIMARY KEY,
  reseller_id VARCHAR(128) NOT NULL,
  panel_id VARCHAR(36),
  plan_id VARCHAR(36),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  username VARCHAR(255),
  password VARCHAR(255),
  expiration_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (reseller_id) REFERENCES resellers(id) ON DELETE CASCADE,
  FOREIGN KEY (panel_id) REFERENCES panels(id) ON DELETE SET NULL,
  FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE SET NULL,
  INDEX idx_reseller_id (reseller_id),
  INDEX idx_panel_id (panel_id),
  INDEX idx_plan_id (plan_id),
  INDEX idx_expiration_date (expiration_date),
  INDEX idx_is_active (is_active),
  INDEX idx_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de faturas
CREATE TABLE IF NOT EXISTS invoices (
  id VARCHAR(36) PRIMARY KEY,
  client_id VARCHAR(36) NOT NULL,
  reseller_id VARCHAR(128) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  status ENUM('pending', 'paid', 'overdue', 'cancelled') DEFAULT 'pending',
  payment_method VARCHAR(50),
  payment_date DATETIME,
  transaction_id VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (reseller_id) REFERENCES resellers(id) ON DELETE CASCADE,
  INDEX idx_client_id (client_id),
  INDEX idx_reseller_id (reseller_id),
  INDEX idx_status (status),
  INDEX idx_due_date (due_date),
  INDEX idx_transaction_id (transaction_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de métodos de pagamento
CREATE TABLE IF NOT EXISTS payment_methods (
  id VARCHAR(36) PRIMARY KEY,
  reseller_id VARCHAR(128) NOT NULL,
  method_type ENUM('mercadopago', 'asaas', 'pix_manual') NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  is_default BOOLEAN DEFAULT FALSE,
  mp_public_key TEXT,
  mp_access_token TEXT,
  asaas_api_key TEXT,
  asaas_pix_key VARCHAR(255),
  asaas_webhook_url TEXT,
  pix_key VARCHAR(255),
  pix_key_type ENUM('cpf', 'cnpj', 'email', 'phone', 'random'),
  pix_holder_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (reseller_id) REFERENCES resellers(id) ON DELETE CASCADE,
  INDEX idx_reseller_id (reseller_id),
  INDEX idx_method_type (method_type),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de planos de assinatura (para resellers)
CREATE TABLE IF NOT EXISTS reseller_subscription_plans (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  duration_days INT NOT NULL DEFAULT 30,
  max_clients INT DEFAULT NULL,
  features JSON,
  is_active BOOLEAN DEFAULT TRUE,
  is_trial BOOLEAN DEFAULT FALSE,
  trial_days INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_is_active (is_active),
  INDEX idx_is_trial (is_trial)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de assinaturas de resellers
CREATE TABLE IF NOT EXISTS reseller_subscriptions (
  id VARCHAR(36) PRIMARY KEY,
  reseller_id VARCHAR(128) NOT NULL,
  plan_id VARCHAR(36) NOT NULL,
  status ENUM('active', 'trial', 'expired', 'cancelled') DEFAULT 'trial',
  is_trial BOOLEAN DEFAULT FALSE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  trial_end_date DATE,
  auto_renew BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (reseller_id) REFERENCES resellers(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES reseller_subscription_plans(id) ON DELETE RESTRICT,
  INDEX idx_reseller_id (reseller_id),
  INDEX idx_plan_id (plan_id),
  INDEX idx_status (status),
  INDEX idx_end_date (end_date),
  INDEX idx_is_trial (is_trial)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de pagamentos de assinatura
CREATE TABLE IF NOT EXISTS reseller_subscription_payments (
  id VARCHAR(36) PRIMARY KEY,
  subscription_id VARCHAR(36) NOT NULL,
  reseller_id VARCHAR(128) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
  payment_method VARCHAR(50),
  transaction_id VARCHAR(255),
  payment_date DATETIME,
  due_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (subscription_id) REFERENCES reseller_subscriptions(id) ON DELETE CASCADE,
  FOREIGN KEY (reseller_id) REFERENCES resellers(id) ON DELETE CASCADE,
  INDEX idx_subscription_id (subscription_id),
  INDEX idx_reseller_id (reseller_id),
  INDEX idx_status (status),
  INDEX idx_transaction_id (transaction_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de tokens de recuperação de senha
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL,
  token VARCHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token (token),
  INDEX idx_user_id (user_id),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de templates WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_reminder_templates (
  id VARCHAR(36) PRIMARY KEY,
  reseller_id VARCHAR(128) NOT NULL,
  event_type ENUM('welcome', 'invoice_available', '7_days_before', '3_days_before', 'due_today', '2_days_after', '5_days_after', 'payment_confirmed') NOT NULL,
  message TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (reseller_id) REFERENCES resellers(id) ON DELETE CASCADE,
  INDEX idx_reseller_id (reseller_id),
  INDEX idx_event_type (event_type),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de logs de lembretes WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_reminder_logs (
  id VARCHAR(36) PRIMARY KEY,
  client_id VARCHAR(36) NOT NULL,
  reseller_id VARCHAR(128) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
  error_message TEXT,
  sent_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (reseller_id) REFERENCES resellers(id) ON DELETE CASCADE,
  INDEX idx_client_id (client_id),
  INDEX idx_reseller_id (reseller_id),
  INDEX idx_status (status),
  INDEX idx_sent_at (sent_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de configurações de lembretes WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_reminder_settings (
  reseller_id VARCHAR(128) PRIMARY KEY,
  is_enabled BOOLEAN DEFAULT TRUE,
  start_hour INT DEFAULT 8,
  end_hour INT DEFAULT 18,
  working_days VARCHAR(20) DEFAULT '1,2,3,4,5,6',
  check_interval_minutes INT DEFAULT 60,
  max_daily_reminders INT DEFAULT 100,
  timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (reseller_id) REFERENCES resellers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de logs de WhatsApp de revendedores
CREATE TABLE IF NOT EXISTS reseller_whatsapp_logs (
  id VARCHAR(36) PRIMARY KEY,
  reseller_id VARCHAR(128) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
  error_message TEXT,
  sent_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reseller_id) REFERENCES resellers(id) ON DELETE CASCADE,
  INDEX idx_reseller_id (reseller_id),
  INDEX idx_status (status),
  INDEX idx_sent_at (sent_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reabilitar verificação de foreign keys
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- DADOS INICIAIS
-- ============================================================================

-- Inserir usuário admin padrão (senha: admin123)
INSERT INTO users (id, name, email, password, role, is_active, is_admin, account_status) 
VALUES (
  'admin-001',
  'Administrador',
  'admin@admin.com',
  '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'admin',
  TRUE,
  TRUE,
  'active'
) ON DUPLICATE KEY UPDATE 
  is_admin = TRUE,
  account_status = 'active';

-- Copiar para tabela resellers
INSERT INTO resellers (id, name, display_name, email, password, role, is_active, is_admin, account_status)
SELECT id, name, name, email, password, role, is_active, is_admin, account_status FROM users
ON DUPLICATE KEY UPDATE 
  is_admin = users.is_admin,
  account_status = users.account_status;

-- Inserir planos de assinatura padrão
INSERT INTO reseller_subscription_plans (id, name, description, price, duration_days, max_clients, trial_days, is_active, is_trial)
VALUES
  ('plan_trial', 'Trial 3 Dias', 'Período de teste gratuito de 3 dias', 0.00, 3, 10, 3, TRUE, TRUE),
  ('plan-basic', 'Básico', 'Plano básico para iniciantes', 29.90, 30, 50, 0, TRUE, FALSE),
  ('plan-pro', 'Profissional', 'Plano profissional com mais recursos', 59.90, 30, 200, 0, TRUE, FALSE),
  ('plan-premium', 'Premium', 'Plano premium ilimitado', 99.90, 30, NULL, 0, TRUE, FALSE)
ON DUPLICATE KEY UPDATE 
  is_trial = VALUES(is_trial),
  trial_days = VALUES(trial_days);

-- Inserir configurações de WhatsApp para admin
INSERT INTO whatsapp_reminder_settings (reseller_id, is_enabled)
VALUES ('admin-001', TRUE)
ON DUPLICATE KEY UPDATE reseller_id = reseller_id;

-- Inserir templates WhatsApp padrão para admin
INSERT INTO whatsapp_reminder_templates (id, reseller_id, event_type, message, is_active)
VALUES
  (UUID(), 'admin-001', 'welcome', 'Olá {{cliente_nome}}! 👋\n\nSeja bem-vindo(a)!\n\nSeus dados de acesso:\n📱 Usuário: {{cliente_usuario}}\n🔐 Senha: {{senha}}\n📅 Vencimento: {{data_vencimento}}\n\nQualquer dúvida, estamos à disposição!', TRUE),
  (UUID(), 'admin-001', 'invoice_available', 'Olá {{cliente_nome}}! 💰\n\nSua fatura está disponível!\n\n💵 Valor: R$ {{valor}}\n📅 Vencimento: {{data_vencimento}}\n\n🔗 Pagar agora: {{link_pagamento}}\n\nPague e renove automaticamente!', TRUE),
  (UUID(), 'admin-001', '7_days_before', 'Olá {{cliente_nome}}! ⏰\n\nSeu plano vence em 7 dias ({{data_vencimento}}).\n\n💵 Valor: R$ {{valor}}\n🔗 Renovar: {{link_pagamento}}\n\nRenove agora e evite interrupções!', TRUE),
  (UUID(), 'admin-001', '3_days_before', 'Olá {{cliente_nome}}! ⚠️\n\nATENÇÃO: Seu plano vence em 3 dias ({{data_vencimento}})!\n\n💵 Valor: R$ {{valor}}\n🔗 Renovar: {{link_pagamento}}\n\nNão perca o acesso!', TRUE),
  (UUID(), 'admin-001', 'due_today', 'Olá {{cliente_nome}}! 🚨\n\nSeu plano VENCE HOJE ({{data_vencimento}})!\n\n💵 Valor: R$ {{valor}}\n🔗 Renovar AGORA: {{link_pagamento}}\n\nRenove para não perder o acesso!', TRUE),
  (UUID(), 'admin-001', '2_days_after', 'Olá {{cliente_nome}}! ❌\n\nSeu plano está VENCIDO desde {{data_vencimento}}.\n\n💵 Valor: R$ {{valor}}\n🔗 Regularizar: {{link_pagamento}}\n\nRenove para reativar seu acesso!', TRUE),
  (UUID(), 'admin-001', '5_days_after', 'Olá {{cliente_nome}}! ⛔\n\nÚLTIMO AVISO: Seu plano está vencido há 5 dias!\n\n💵 Valor: R$ {{valor}}\n🔗 Renovar: {{link_pagamento}}\n\nRenove hoje ou perderá o acesso definitivamente!', TRUE),
  (UUID(), 'admin-001', 'payment_confirmed', 'Olá {{cliente_nome}}! ✅\n\nPagamento CONFIRMADO!\n\n💰 Valor: R$ {{valor}}\n📅 Novo vencimento: {{data_vencimento}}\n\nSeu acesso foi renovado automaticamente!\n\nObrigado pela preferência! 🎉', TRUE)
ON DUPLICATE KEY UPDATE whatsapp_reminder_templates.id=whatsapp_reminder_templates.id;

-- ============================================================================
-- FINALIZAÇÃO
-- ============================================================================

SELECT '✅ Instalação concluída com sucesso!' AS status;
SELECT 'Credenciais padrão: admin@admin.com / admin123' AS info;
SELECT 'IMPORTANTE: Altere a senha após o primeiro login!' AS warning;
SELECT 'Banco de dados: ultragestor_db' AS database_info;
