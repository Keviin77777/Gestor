-- ============================================================================
-- Migration: Admin Payment Methods for Reseller Subscriptions
-- Version: 009
-- Description: Adiciona suporte para métodos de pagamento do admin nas assinaturas
-- ============================================================================

USE iptv_manager;

-- ============================================================================
-- Adicionar coluna is_admin na tabela resellers (se não existir)
-- ============================================================================

SET @col_exists = (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'resellers' 
    AND COLUMN_NAME = 'is_admin'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE resellers ADD COLUMN is_admin BOOLEAN DEFAULT FALSE COMMENT "Indica se é o administrador do sistema"',
  'SELECT "Coluna is_admin já existe" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Adicionar índice para is_admin
SET @idx_exists = (
  SELECT COUNT(*) 
  FROM information_schema.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'resellers' 
    AND INDEX_NAME = 'idx_is_admin'
);

SET @sql = IF(@idx_exists = 0,
  'ALTER TABLE resellers ADD INDEX idx_is_admin (is_admin)',
  'SELECT "Índice idx_is_admin já existe" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================================
-- Adicionar coluna external_id na tabela reseller_payment_history (se não existir)
-- ============================================================================

SET @col_exists = (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'reseller_payment_history' 
    AND COLUMN_NAME = 'external_id'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE reseller_payment_history ADD COLUMN external_id VARCHAR(255) NULL COMMENT "ID externo do gateway (Mercado Pago, Asaas)" AFTER transaction_id',
  'SELECT "Coluna external_id já existe" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Adicionar índice para external_id
SET @idx_exists = (
  SELECT COUNT(*) 
  FROM information_schema.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'reseller_payment_history' 
    AND INDEX_NAME = 'idx_external_id'
);

SET @sql = IF(@idx_exists = 0,
  'ALTER TABLE reseller_payment_history ADD INDEX idx_external_id (external_id)',
  'SELECT "Índice idx_external_id já existe" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================================
-- Adicionar coluna payment_method_type na tabela reseller_payment_history
-- ============================================================================

SET @col_exists = (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'reseller_payment_history' 
    AND COLUMN_NAME = 'payment_method_type'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE reseller_payment_history ADD COLUMN payment_method_type ENUM("mercadopago", "asaas", "pix_manual") NULL COMMENT "Tipo do método de pagamento usado" AFTER payment_method',
  'SELECT "Coluna payment_method_type já existe" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================================
-- Criar ou atualizar o usuário admin padrão
-- ============================================================================

-- Verificar se já existe um admin
SET @admin_exists = (
  SELECT COUNT(*) 
  FROM resellers 
  WHERE is_admin = 1
);

-- Se não existir admin, criar um padrão
-- IMPORTANTE: Altere o email e senha após a instalação!
SET @sql = IF(@admin_exists = 0,
  'INSERT INTO resellers (id, email, display_name, is_admin, is_active, email_verified) 
   VALUES ("admin_001", "admin@admin.com", "Administrador", TRUE, TRUE, TRUE)',
  'SELECT "Admin já existe" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================================
-- VIEW: Métodos de pagamento do admin
-- ============================================================================

CREATE OR REPLACE VIEW v_admin_payment_methods AS
SELECT 
  pm.id,
  pm.method_type,
  pm.is_active,
  pm.is_default,
  pm.created_at,
  pm.updated_at,
  r.email as admin_email,
  r.display_name as admin_name
FROM payment_methods pm
INNER JOIN resellers r ON pm.reseller_id = r.id
WHERE r.is_admin = TRUE
  AND pm.is_active = TRUE
ORDER BY pm.is_default DESC, pm.created_at DESC;

-- ============================================================================
-- Procedure: Buscar método de pagamento do admin
-- ============================================================================

DELIMITER //

CREATE PROCEDURE IF NOT EXISTS sp_get_admin_payment_method()
BEGIN
  SELECT 
    pm.id,
    pm.method_type,
    pm.mp_public_key,
    pm.mp_access_token,
    pm.asaas_api_key,
    pm.asaas_pix_key
  FROM payment_methods pm
  INNER JOIN resellers r ON pm.reseller_id = r.id
  WHERE r.is_admin = TRUE
    AND pm.is_active = TRUE
    AND pm.is_default = TRUE
    AND pm.method_type IN ('mercadopago', 'asaas')
  LIMIT 1;
END //

DELIMITER ;

-- ============================================================================
-- Comentários e documentação
-- ============================================================================

-- Esta migration adiciona suporte para que as assinaturas dos revendas
-- usem os métodos de pagamento configurados pelo administrador do sistema.
-- 
-- Fluxo:
-- 1. Admin configura Mercado Pago ou Asaas em "Métodos de Pagamento"
-- 2. Revendas acessam "Renovar Acesso" e escolhem um plano
-- 3. Sistema busca o método de pagamento do admin (is_admin = 1)
-- 4. Gera PIX usando a API do Mercado Pago ou Asaas
-- 5. Revenda paga e sistema ativa a assinatura automaticamente

-- ============================================================================
-- FIM DA MIGRATION
-- ============================================================================
