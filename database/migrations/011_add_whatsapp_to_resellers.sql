-- ============================================
-- MIGRATION 011: Adicionar WhatsApp na tabela resellers
-- ============================================

USE iptv_manager;

-- Verificar e adicionar coluna whatsapp
SET @col_exists = (
    SELECT COUNT(*) 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'resellers'
      AND COLUMN_NAME = 'whatsapp'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE resellers ADD COLUMN whatsapp VARCHAR(20) NULL COMMENT ''Número de WhatsApp do revendedor'' AFTER display_name',
    'SELECT ''Coluna whatsapp já existe'' AS info'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Adicionar índice para busca por WhatsApp
SET @idx_exists = (
    SELECT COUNT(*) 
    FROM information_schema.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'resellers'
      AND INDEX_NAME = 'idx_whatsapp'
);

SET @sql = IF(@idx_exists = 0,
    'ALTER TABLE resellers ADD INDEX idx_whatsapp (whatsapp)',
    'SELECT ''Índice idx_whatsapp já existe'' AS info'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- VERIFICAÇÃO
-- ============================================

SELECT '=== ESTRUTURA ATUALIZADA ===' as info;
DESCRIBE resellers;

-- ============================================
-- FIM
-- ============================================
