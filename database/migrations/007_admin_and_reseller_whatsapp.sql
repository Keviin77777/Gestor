-- ============================================================================
-- Migração: Sistema Admin e WhatsApp para Revendas
-- Descrição: Adiciona controle admin e templates WhatsApp para revendas
-- ============================================================================

USE iptv_manager;

-- ============================================================================
-- 1. Adicionar campos admin e telefone em resellers
-- ============================================================================

-- Adicionar campo is_admin
ALTER TABLE resellers 
ADD COLUMN is_admin BOOLEAN DEFAULT FALSE COMMENT 'Indica se é administrador do sistema';

-- Adicionar campo phone se não existir
ALTER TABLE resellers 
ADD COLUMN phone VARCHAR(50) NULL COMMENT 'Telefone do revenda para WhatsApp';

-- Adicionar índice
ALTER TABLE resellers 
ADD INDEX idx_is_admin (is_admin);

-- Definir usuário admin atual
UPDATE resellers 
SET is_admin = TRUE 
WHERE email = 'admin@admin.com' OR id = 'admin-user-001';

-- ============================================================================
-- 2. Criar tabela de templates WhatsApp para revendas
-- ============================================================================

CREATE TABLE IF NOT EXISTS reseller_whatsapp_templates (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL COMMENT 'Nome do template',
  trigger_type ENUM(
    'expiring_7days',
    'expiring_3days', 
    'expiring_1day',
    'expired',
    'payment_confirmed',
    'welcome',
    'manual'
  ) NOT NULL COMMENT 'Quando enviar',
  message TEXT NOT NULL COMMENT 'Mensagem do template',
  is_active BOOLEAN DEFAULT TRUE,
  created_by VARCHAR(128) COMMENT 'Admin que criou',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_trigger_type (trigger_type),
  INDEX idx_is_active (is_active),
  INDEX idx_created_by (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 3. Criar tabela de histórico de WhatsApp para revendas
-- ============================================================================

CREATE TABLE IF NOT EXISTS reseller_whatsapp_logs (
  id VARCHAR(36) PRIMARY KEY,
  reseller_id VARCHAR(128) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  trigger_type VARCHAR(50) COMMENT 'Tipo de gatilho',
  status ENUM('sent', 'failed', 'pending') DEFAULT 'pending',
  error_message TEXT,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (reseller_id) REFERENCES resellers(id) ON DELETE CASCADE,
  INDEX idx_reseller_id (reseller_id),
  INDEX idx_status (status),
  INDEX idx_sent_at (sent_at),
  INDEX idx_trigger_type (trigger_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 4. Inserir templates padrão para revendas
-- ============================================================================

DELETE FROM reseller_whatsapp_templates;

INSERT INTO reseller_whatsapp_templates (id, name, trigger_type, message, is_active, created_by) VALUES
(
  'tpl_reseller_7days',
  'Assinatura vence em 7 dias',
  'expiring_7days',
  '⚠️ *Atenção {{revenda_nome}}!*

Sua assinatura do *{{plano_nome}}* vence em *7 dias*!

📅 Vencimento: {{data_vencimento}}
💰 Valor para renovar: R$ {{valor}}

🔄 Renove agora e mantenha seu acesso:
{{link_renovacao}}

Não perca o acesso ao seu painel de gestão!',
  TRUE,
  'admin-user-001'
),
(
  'tpl_reseller_3days',
  'Assinatura vence em 3 dias',
  'expiring_3days',
  '🚨 *URGENTE {{revenda_nome}}!*

Sua assinatura vence em apenas *3 dias*!

📅 Vencimento: {{data_vencimento}}
💰 Valor: R$ {{valor}}

⚡ Renove AGORA para não perder o acesso:
{{link_renovacao}}

Evite interrupções no seu negócio!',
  TRUE,
  'admin-user-001'
),
(
  'tpl_reseller_1day',
  'Assinatura vence AMANHÃ',
  'expiring_1day',
  '🔴 *ÚLTIMA CHANCE {{revenda_nome}}!*

Sua assinatura vence *AMANHÃ*!

📅 Vencimento: {{data_vencimento}}
💰 Valor: R$ {{valor}}

⚡ RENOVE AGORA:
{{link_renovacao}}

Não deixe para última hora!',
  TRUE,
  'admin-user-001'
),
(
  'tpl_reseller_expired',
  'Assinatura VENCIDA',
  'expired',
  '❌ *ASSINATURA VENCIDA - {{revenda_nome}}*

Sua assinatura do GestPlay está *VENCIDA*!

📅 Venceu em: {{data_vencimento}}
💰 Renove por: R$ {{valor}}

🔄 Renovar agora:
{{link_renovacao}}

Recupere o acesso ao seu painel imediatamente!',
  TRUE,
  'admin-user-001'
),
(
  'tpl_reseller_confirmed',
  'Pagamento Confirmado',
  'payment_confirmed',
  '✅ *PAGAMENTO CONFIRMADO!*

Olá {{revenda_nome}}!

Seu pagamento foi confirmado com sucesso! 🎉

📦 Plano: {{plano_nome}}
💰 Valor: R$ {{valor}}
📅 Válido até: {{data_vencimento}}

Seu acesso está ativo e renovado!

Obrigado por confiar no GestPlay! 🚀',
  TRUE,
  'admin-user-001'
),
(
  'tpl_reseller_welcome',
  'Boas-vindas Revenda',
  'welcome',
  '🎉 *Bem-vindo ao GestPlay!*

Olá {{revenda_nome}}!

Sua conta foi criada com sucesso!

📧 Email: {{revenda_email}}
📅 Assinatura válida até: {{data_vencimento}}

Acesse seu painel:
http://localhost:9002

Qualquer dúvida, estamos à disposição!',
  TRUE,
  'admin-user-001'
);

-- ============================================================================
-- 5. VIEW: Resumo de mensagens WhatsApp para revendas
-- ============================================================================

CREATE OR REPLACE VIEW v_reseller_whatsapp_summary AS
SELECT 
  r.id as reseller_id,
  r.email,
  r.display_name,
  r.phone,
  COUNT(rwl.id) as total_messages,
  SUM(CASE WHEN rwl.status = 'sent' THEN 1 ELSE 0 END) as sent_count,
  SUM(CASE WHEN rwl.status = 'failed' THEN 1 ELSE 0 END) as failed_count,
  MAX(rwl.sent_at) as last_message_at
FROM resellers r
LEFT JOIN reseller_whatsapp_logs rwl ON r.id = rwl.reseller_id
WHERE r.is_active = TRUE
GROUP BY r.id, r.email, r.display_name, r.phone;

-- ============================================================================
-- FIM DA MIGRAÇÃO
-- ============================================================================

SELECT 'Migração 007 concluída com sucesso!' as status;
SELECT COUNT(*) as total_templates FROM reseller_whatsapp_templates;
SELECT email, is_admin FROM resellers WHERE is_admin = TRUE;
