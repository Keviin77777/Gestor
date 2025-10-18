-- ============================================================================
-- INSTALAÇÃO COMPLETA - Sistema de Métodos de Pagamento
-- Para MySQL Workbench
-- ============================================================================
-- 
-- INSTRUÇÕES:
-- 1. Abra este arquivo no MySQL Workbench
-- 2. Selecione o banco 'iptv_manager' no dropdown
-- 3. Clique no ícone de raio (Execute) ou pressione Ctrl+Shift+Enter
-- 4. Aguarde a mensagem de sucesso
--
-- ============================================================================

USE iptv_manager;

-- ============================================================================
-- PARTE 1: Criar Tabelas
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
  INDEX idx_is_default (is_default)
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

-- ============================================================================
-- PARTE 2: Adicionar Colunas na Tabela Invoices
-- ============================================================================

-- Verificar se coluna já existe antes de adicionar
SET @dbname = DATABASE();
SET @tablename = 'invoices';
SET @columnname = 'payment_link';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' TEXT COMMENT ''Link de pagamento gerado''')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Adicionar coluna payment_method_id
SET @columnname = 'payment_method_id';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' VARCHAR(36) COMMENT ''Método de pagamento usado''')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Adicionar índice
SET @indexname = 'idx_payment_method';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (index_name = @indexname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD INDEX ', @indexname, ' (payment_method_id)')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ============================================================================
-- PARTE 3: Atualizar Templates WhatsApp
-- ============================================================================

-- Atualizar template de fatura disponível para incluir link de pagamento
UPDATE whatsapp_templates 
SET message = CONCAT(
    message,
    '\n\n🔗 Pagar agora:\n{{link_fatura}}\n\nPagamento via PIX instantâneo! ⚡'
)
WHERE trigger_event = 'invoice_generated' 
AND message NOT LIKE '%{{link_fatura}}%';

-- ============================================================================
-- PARTE 4: Verificação
-- ============================================================================

-- Verificar tabelas criadas
SELECT 
    'Verificação de Tabelas' as 'Status',
    CASE 
        WHEN COUNT(*) = 3 THEN '✅ OK - Todas as tabelas criadas'
        ELSE '❌ ERRO - Faltam tabelas'
    END as 'Resultado'
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'iptv_manager' 
AND TABLE_NAME IN ('payment_methods', 'payment_transactions', 'payment_webhooks');

-- Verificar colunas adicionadas
SELECT 
    'Verificação de Colunas' as 'Status',
    CASE 
        WHEN COUNT(*) = 2 THEN '✅ OK - Colunas adicionadas em invoices'
        ELSE '❌ ERRO - Faltam colunas'
    END as 'Resultado'
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'iptv_manager' 
AND TABLE_NAME = 'invoices'
AND COLUMN_NAME IN ('payment_link', 'payment_method_id');

-- Verificar templates atualizados
SELECT 
    'Verificação de Templates' as 'Status',
    CASE 
        WHEN COUNT(*) > 0 THEN CONCAT('✅ OK - ', COUNT(*), ' template(s) atualizado(s)')
        ELSE '⚠️  AVISO - Nenhum template atualizado (pode ser normal)'
    END as 'Resultado'
FROM whatsapp_templates
WHERE message LIKE '%{{link_fatura}}%';

-- ============================================================================
-- SUCESSO!
-- ============================================================================

SELECT 
    '🎉 INSTALAÇÃO CONCLUÍDA!' as 'Status',
    'Sistema de Métodos de Pagamento instalado com sucesso!' as 'Mensagem';

SELECT 
    'Próximo Passo' as 'Ação',
    'Acesse Dashboard → Pagamentos → Métodos para configurar' as 'Instrução';

-- ============================================================================
-- FIM DA INSTALAÇÃO
-- ============================================================================
