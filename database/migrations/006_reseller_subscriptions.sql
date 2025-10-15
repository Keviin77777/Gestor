-- ============================================================================
-- Migração: Sistema de Assinaturas para Revendas
-- Descrição: Adiciona planos de assinatura e histórico de pagamentos
-- ============================================================================

USE iptv_manager;

-- ============================================================================
-- TABLE: reseller_subscription_plans
-- Planos disponíveis para assinatura dos revendas
-- ============================================================================
CREATE TABLE IF NOT EXISTS reseller_subscription_plans (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL COMMENT 'Nome do plano (Mensal, Semestral, Anual)',
  duration_days INT NOT NULL COMMENT 'Duração em dias',
  price DECIMAL(10, 2) NOT NULL COMMENT 'Preço do plano',
  description TEXT COMMENT 'Descrição do plano',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: reseller_subscriptions
-- Assinaturas ativas dos revendas
-- ============================================================================
CREATE TABLE IF NOT EXISTS reseller_subscriptions (
  id VARCHAR(36) PRIMARY KEY,
  reseller_id VARCHAR(128) NOT NULL,
  plan_id VARCHAR(36) NOT NULL,
  start_date DATE NOT NULL COMMENT 'Data de início da assinatura',
  expiry_date DATE NOT NULL COMMENT 'Data de vencimento da assinatura',
  status ENUM('active', 'expired', 'cancelled') DEFAULT 'active',
  auto_renew BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (reseller_id) REFERENCES resellers(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES reseller_subscription_plans(id) ON DELETE RESTRICT,
  INDEX idx_reseller_id (reseller_id),
  INDEX idx_plan_id (plan_id),
  INDEX idx_status (status),
  INDEX idx_expiry_date (expiry_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: reseller_payment_history
-- Histórico de pagamentos dos revendas
-- ============================================================================
CREATE TABLE IF NOT EXISTS reseller_payment_history (
  id VARCHAR(36) PRIMARY KEY,
  reseller_id VARCHAR(128) NOT NULL,
  subscription_id VARCHAR(36),
  plan_id VARCHAR(36) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL COMMENT 'Valor pago',
  payment_method VARCHAR(50) DEFAULT 'pix' COMMENT 'Método de pagamento',
  payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Data do pagamento',
  status ENUM('pending', 'paid', 'failed', 'cancelled') DEFAULT 'pending',
  transaction_id VARCHAR(100) COMMENT 'ID da transação do gateway',
  pix_code TEXT COMMENT 'Código PIX copia e cola',
  qr_code TEXT COMMENT 'QR Code em base64',
  expires_at TIMESTAMP NULL COMMENT 'Expiração do PIX',
  notes TEXT COMMENT 'Observações',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (reseller_id) REFERENCES resellers(id) ON DELETE CASCADE,
  FOREIGN KEY (subscription_id) REFERENCES reseller_subscriptions(id) ON DELETE SET NULL,
  FOREIGN KEY (plan_id) REFERENCES reseller_subscription_plans(id) ON DELETE RESTRICT,
  INDEX idx_reseller_id (reseller_id),
  INDEX idx_subscription_id (subscription_id),
  INDEX idx_status (status),
  INDEX idx_payment_date (payment_date),
  INDEX idx_transaction_id (transaction_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Inserir Planos Padrão
-- ============================================================================
INSERT INTO reseller_subscription_plans (id, name, duration_days, price, description, is_active) VALUES
('plan_monthly', 'Plano Mensal', 30, 39.90, 'Acesso completo por 30 dias', TRUE),
('plan_semester', 'Plano Semestral', 180, 200.90, 'Acesso completo por 6 meses', TRUE),
('plan_annual', 'Plano Anual', 365, 380.90, 'Acesso completo por 1 ano', TRUE)
AS new_plans
ON DUPLICATE KEY UPDATE 
  price = new_plans.price,
  description = new_plans.description,
  updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- Adicionar campo de vencimento na tabela resellers (se não existir)
-- ============================================================================

-- Verificar e adicionar coluna subscription_expiry_date
SET @col_exists = (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = 'iptv_manager' 
    AND TABLE_NAME = 'resellers' 
    AND COLUMN_NAME = 'subscription_expiry_date'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE resellers ADD COLUMN subscription_expiry_date DATE NULL COMMENT "Data de vencimento da assinatura"',
  'SELECT "Coluna subscription_expiry_date já existe" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar e adicionar índice
SET @idx_exists = (
  SELECT COUNT(*) 
  FROM information_schema.STATISTICS 
  WHERE TABLE_SCHEMA = 'iptv_manager' 
    AND TABLE_NAME = 'resellers' 
    AND INDEX_NAME = 'idx_subscription_expiry'
);

SET @sql = IF(@idx_exists = 0,
  'ALTER TABLE resellers ADD INDEX idx_subscription_expiry (subscription_expiry_date)',
  'SELECT "Índice idx_subscription_expiry já existe" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================================
-- VIEW: Resumo de assinaturas ativas
-- ============================================================================
CREATE OR REPLACE VIEW v_reseller_subscriptions_summary AS
SELECT 
  r.id as reseller_id,
  r.email,
  r.display_name,
  r.subscription_expiry_date,
  rs.id as subscription_id,
  rs.status as subscription_status,
  rsp.name as plan_name,
  rsp.price as plan_price,
  DATEDIFF(r.subscription_expiry_date, DATE(CONVERT_TZ(NOW(), '+00:00', '-03:00'))) as days_remaining,
  CASE 
    WHEN r.subscription_expiry_date IS NULL THEN 'no_subscription'
    WHEN r.subscription_expiry_date < DATE(CONVERT_TZ(NOW(), '+00:00', '-03:00')) THEN 'expired'
    WHEN DATEDIFF(r.subscription_expiry_date, DATE(CONVERT_TZ(NOW(), '+00:00', '-03:00'))) <= 7 THEN 'expiring_soon'
    ELSE 'active'
  END as subscription_health
FROM resellers r
LEFT JOIN reseller_subscriptions rs ON r.id = rs.reseller_id AND rs.status = 'active'
LEFT JOIN reseller_subscription_plans rsp ON rs.plan_id = rsp.id
WHERE r.is_active = TRUE;

-- ============================================================================
-- Procedure: Ativar assinatura após pagamento
-- ============================================================================
DELIMITER //

CREATE PROCEDURE IF NOT EXISTS sp_activate_reseller_subscription(
  IN p_payment_id VARCHAR(36),
  IN p_reseller_id VARCHAR(128)
)
BEGIN
  DECLARE v_plan_id VARCHAR(36);
  DECLARE v_duration_days INT;
  DECLARE v_subscription_id VARCHAR(36);
  DECLARE v_new_expiry_date DATE;
  DECLARE v_current_expiry DATE;
  
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;
  
  START TRANSACTION;
  
  -- Buscar informações do pagamento
  SELECT plan_id INTO v_plan_id
  FROM reseller_payment_history
  WHERE id = p_payment_id AND reseller_id = p_reseller_id AND status = 'pending';
  
  IF v_plan_id IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Pagamento não encontrado ou já processado';
  END IF;
  
  -- Buscar duração do plano
  SELECT duration_days INTO v_duration_days
  FROM reseller_subscription_plans
  WHERE id = v_plan_id;
  
  -- Verificar se já tem assinatura ativa
  SELECT subscription_expiry_date INTO v_current_expiry
  FROM resellers
  WHERE id = p_reseller_id;
  
  -- Calcular nova data de vencimento
  IF v_current_expiry IS NULL OR v_current_expiry < CURDATE() THEN
    SET v_new_expiry_date = DATE_ADD(CURDATE(), INTERVAL v_duration_days DAY);
  ELSE
    SET v_new_expiry_date = DATE_ADD(v_current_expiry, INTERVAL v_duration_days DAY);
  END IF;
  
  -- Criar ou atualizar assinatura
  SET v_subscription_id = CONCAT('sub_', UNIX_TIMESTAMP(), '_', SUBSTRING(MD5(RAND()), 1, 8));
  
  INSERT INTO reseller_subscriptions (id, reseller_id, plan_id, start_date, expiry_date, status)
  VALUES (v_subscription_id, p_reseller_id, v_plan_id, CURDATE(), v_new_expiry_date, 'active');
  
  -- Atualizar data de vencimento no reseller
  UPDATE resellers
  SET subscription_expiry_date = v_new_expiry_date
  WHERE id = p_reseller_id;
  
  -- Atualizar status do pagamento
  UPDATE reseller_payment_history
  SET status = 'paid',
      subscription_id = v_subscription_id,
      payment_date = NOW()
  WHERE id = p_payment_id;
  
  COMMIT;
END //

DELIMITER ;

-- ============================================================================
-- Event: Verificar assinaturas expiradas diariamente
-- ============================================================================
DELIMITER //

CREATE EVENT IF NOT EXISTS evt_check_expired_subscriptions
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP
DO
BEGIN
  -- Marcar assinaturas como expiradas
  UPDATE reseller_subscriptions
  SET status = 'expired'
  WHERE expiry_date < CURDATE() AND status = 'active';
  
  -- Criar notificações para assinaturas próximas do vencimento (7 dias)
  INSERT INTO notifications (id, reseller_id, type, title, message, priority, created_at)
  SELECT 
    CONCAT('notif_', UNIX_TIMESTAMP(), '_', SUBSTRING(MD5(RAND()), 1, 8)),
    r.id,
    'system',
    'Assinatura próxima do vencimento',
    CONCAT('Sua assinatura vence em ', DATEDIFF(r.subscription_expiry_date, DATE(CONVERT_TZ(NOW(), '+00:00', '-03:00'))), ' dias. Renove agora!'),
    'high',
    NOW()
  FROM resellers r
  WHERE r.subscription_expiry_date IS NOT NULL
    AND DATEDIFF(r.subscription_expiry_date, DATE(CONVERT_TZ(NOW(), '+00:00', '-03:00'))) = 7
    AND r.is_active = TRUE
    AND NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.reseller_id = r.id
        AND n.type = 'system'
        AND DATE(n.created_at) = CURDATE()
        AND n.message LIKE '%vence em 7 dias%'
    );
END //

DELIMITER ;

-- Ativar o event scheduler se não estiver ativo
SET GLOBAL event_scheduler = ON;

-- ============================================================================
-- FIM DA MIGRAÇÃO
-- ============================================================================
