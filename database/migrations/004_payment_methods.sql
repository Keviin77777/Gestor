-- ============================================================================
-- Migration: Payment Methods System
-- Version: 004
-- Description: Sistema de métodos de pagamento (Mercado Pago, Asaas, PIX Manual)
-- ============================================================================

-- Tabela de configurações de métodos de pagamento
CREATE TABLE IF NOT EXISTS payment_methods (
  id VARCHAR(36) PRIMARY KEY,
  reseller_id VARCHAR(128) NOT NULL,
  method_type ENUM('mercadopago', 'asaas', 'pix_manual') NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  is_default BOOLEAN DEFAULT FALSE,
  
  -- Mercado Pago
  mp_public_key TEXT COMMENT 'Mercado Pago Public Key',
  mp_access_token TEXT COMMENT 'Mercado Pago Access Token',
  
  -- Asaas
  asaas_api_key TEXT COMMENT 'Asaas API Key',
  asaas_pix_key VARCHAR(255) COMMENT 'Chave PIX do Asaas',
  asaas_webhook_url TEXT COMMENT 'URL do webhook para configurar no Asaas',
  
  -- PIX Manual
  pix_key VARCHAR(255) COMMENT 'Chave PIX para pagamento manual',
  pix_key_type ENUM('cpf', 'cnpj', 'email', 'phone', 'random') COMMENT 'Tipo da chave PIX',
  pix_holder_name VARCHAR(255) COMMENT 'Nome do titular da conta PIX',
  
  -- Metadados
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (reseller_id) REFERENCES resellers(id) ON DELETE CASCADE,
  INDEX idx_reseller_id (reseller_id),
  INDEX idx_method_type (method_type),
  INDEX idx_is_active (is_active),
  INDEX idx_is_default (is_default),
  
  -- Garantir apenas um método padrão por reseller
  UNIQUE KEY unique_default_per_reseller (reseller_id, is_default, method_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT = 'Configurações de métodos de pagamento por revendedor';

-- Tabela de transações de pagamento
CREATE TABLE IF NOT EXISTS payment_transactions (
  id VARCHAR(36) PRIMARY KEY,
  reseller_id VARCHAR(128) NOT NULL,
  invoice_id VARCHAR(36) NOT NULL,
  payment_method_id VARCHAR(36) NOT NULL,
  method_type ENUM('mercadopago', 'asaas', 'pix_manual') NOT NULL,
  
  -- Dados da transação
  external_id VARCHAR(255) COMMENT 'ID da transação no gateway (Mercado Pago, Asaas)',
  payment_link TEXT COMMENT 'Link de pagamento gerado',
  qr_code TEXT COMMENT 'QR Code PIX (base64 ou URL)',
  pix_code TEXT COMMENT 'Código PIX copia e cola',
  
  -- Status
  status ENUM('pending', 'processing', 'approved', 'rejected', 'cancelled', 'refunded') DEFAULT 'pending',
  amount DECIMAL(10, 2) NOT NULL,
  paid_amount DECIMAL(10, 2) COMMENT 'Valor efetivamente pago',
  
  -- Datas
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  paid_at TIMESTAMP NULL,
  expires_at TIMESTAMP NULL COMMENT 'Data de expiração do link/PIX',
  
  -- Metadados
  gateway_response JSON COMMENT 'Resposta completa do gateway',
  notes TEXT,
  
  FOREIGN KEY (reseller_id) REFERENCES resellers(id) ON DELETE CASCADE,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE RESTRICT,
  INDEX idx_reseller_id (reseller_id),
  INDEX idx_invoice_id (invoice_id),
  INDEX idx_external_id (external_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT = 'Histórico de transações de pagamento';

-- Tabela de webhooks recebidos
CREATE TABLE IF NOT EXISTS payment_webhooks (
  id VARCHAR(36) PRIMARY KEY,
  reseller_id VARCHAR(128),
  method_type ENUM('mercadopago', 'asaas') NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  external_id VARCHAR(255),
  payload JSON NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP NULL,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_reseller_id (reseller_id),
  INDEX idx_method_type (method_type),
  INDEX idx_external_id (external_id),
  INDEX idx_processed (processed),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT = 'Log de webhooks recebidos dos gateways de pagamento';

-- Adicionar coluna payment_link na tabela invoices
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS payment_link TEXT COMMENT 'Link de pagamento gerado',
ADD COLUMN IF NOT EXISTS payment_method_id VARCHAR(36) COMMENT 'Método de pagamento usado',
ADD INDEX idx_payment_method (payment_method_id);

-- ============================================================================
-- Stored Procedures
-- ============================================================================

DELIMITER //

-- Procedure para criar método de pagamento
CREATE PROCEDURE IF NOT EXISTS sp_create_payment_method(
  IN p_id VARCHAR(36),
  IN p_reseller_id VARCHAR(128),
  IN p_method_type VARCHAR(20),
  IN p_is_active BOOLEAN,
  IN p_is_default BOOLEAN,
  IN p_config JSON
)
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;
  
  START TRANSACTION;
  
  -- Se este método for padrão, desativar outros padrões
  IF p_is_default = TRUE THEN
    UPDATE payment_methods 
    SET is_default = FALSE 
    WHERE reseller_id = p_reseller_id AND method_type = p_method_type;
  END IF;
  
  -- Inserir novo método
  INSERT INTO payment_methods (
    id, reseller_id, method_type, is_active, is_default,
    mp_public_key, mp_access_token,
    asaas_api_key, asaas_pix_key, asaas_webhook_url,
    pix_key, pix_key_type, pix_holder_name
  ) VALUES (
    p_id, p_reseller_id, p_method_type, p_is_active, p_is_default,
    JSON_UNQUOTE(JSON_EXTRACT(p_config, '$.mp_public_key')),
    JSON_UNQUOTE(JSON_EXTRACT(p_config, '$.mp_access_token')),
    JSON_UNQUOTE(JSON_EXTRACT(p_config, '$.asaas_api_key')),
    JSON_UNQUOTE(JSON_EXTRACT(p_config, '$.asaas_pix_key')),
    JSON_UNQUOTE(JSON_EXTRACT(p_config, '$.asaas_webhook_url')),
    JSON_UNQUOTE(JSON_EXTRACT(p_config, '$.pix_key')),
    JSON_UNQUOTE(JSON_EXTRACT(p_config, '$.pix_key_type')),
    JSON_UNQUOTE(JSON_EXTRACT(p_config, '$.pix_holder_name'))
  );
  
  COMMIT;
END //

DELIMITER ;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
