-- ============================================================================
-- INSTALAÇÃO COMPLETA - UltraGestor
-- Versão: 2.0
-- ============================================================================

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
  cpf_cnpj VARCHAR(18),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(2),
  zip_code VARCHAR(10),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Alias para resellers (compatibilidade)
CREATE TABLE IF NOT EXISTS resellers (
  id VARCHAR(128) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'reseller') DEFAULT 'reseller',
  phone VARCHAR(20),
  cpf_cnpj VARCHAR(18),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(2),
  zip_code VARCHAR(10),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_is_active (is_active)
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
CREATE TABLE IF NOT EXISTS subscription_plans (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  duration_days INT NOT NULL DEFAULT 30,
  max_clients INT DEFAULT NULL,
  features JSON,
  is_active BOOLEAN DEFAULT TRUE,
  trial_days INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de assinaturas de resellers
CREATE TABLE IF NOT EXISTS reseller_subscriptions (
  id VARCHAR(36) PRIMARY KEY,
  reseller_id VARCHAR(128) NOT NULL,
  plan_id VARCHAR(36) NOT NULL,
  status ENUM('active', 'trial', 'expired', 'cancelled') DEFAULT 'trial',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  trial_end_date DATE,
  auto_renew BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (reseller_id) REFERENCES resellers(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  INDEX idx_reseller_id (reseller_id),
  INDEX idx_plan_id (plan_id),
  INDEX idx_status (status),
  INDEX idx_end_date (end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de pagamentos de assinatura
CREATE TABLE IF NOT EXISTS subscription_payments (
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

-- Reabilitar verificação de foreign keys
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- DADOS INICIAIS
-- ============================================================================

-- Inserir usuário admin padrão (senha: admin123)
INSERT INTO users (id, name, email, password, role, is_active) 
VALUES (
  'admin-001',
  'Administrador',
  'admin@admin.com',
  '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'admin',
  TRUE
) ON DUPLICATE KEY UPDATE users.id=users.id;

-- Copiar para tabela resellers
INSERT INTO resellers (id, name, email, password, role, is_active)
SELECT id, name, email, password, role, is_active FROM users
ON DUPLICATE KEY UPDATE resellers.id=resellers.id;

-- Inserir planos de assinatura padrão
INSERT INTO subscription_plans (id, name, description, price, duration_days, max_clients, trial_days, is_active)
VALUES
  ('plan-basic', 'Básico', 'Plano básico para iniciantes', 29.90, 30, 50, 7, TRUE),
  ('plan-pro', 'Profissional', 'Plano profissional com mais recursos', 59.90, 30, 200, 7, TRUE),
  ('plan-premium', 'Premium', 'Plano premium ilimitado', 99.90, 30, NULL, 7, TRUE)
ON DUPLICATE KEY UPDATE subscription_plans.id=subscription_plans.id;

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
