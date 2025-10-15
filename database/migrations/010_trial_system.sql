-- ============================================
-- MIGRATION 010: Sistema de Trial de 3 Dias
-- ============================================

-- 1. Adicionar coluna is_trial na tabela de planos PRIMEIRO
-- Verificar se a coluna já existe antes de adicionar
SET @col_exists = (
    SELECT COUNT(*) 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'reseller_subscription_plans'
      AND COLUMN_NAME = 'is_trial'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE reseller_subscription_plans ADD COLUMN is_trial BOOLEAN DEFAULT FALSE COMMENT ''Indica se é um plano de trial gratuito''',
    'SELECT ''Coluna is_trial já existe'' AS info'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Criar plano Trial (agora que a coluna existe)
INSERT INTO reseller_subscription_plans (
    id,
    name,
    description,
    price,
    duration_days,
    is_active,
    is_trial
) VALUES (
    'plan_trial',
    'Trial 3 Dias',
    'Período de teste gratuito de 3 dias',
    0.00,
    3,
    TRUE,
    TRUE
) ON DUPLICATE KEY UPDATE
    name = 'Trial 3 Dias',
    description = 'Período de teste gratuito de 3 dias',
    price = 0.00,
    duration_days = 3,
    is_trial = TRUE;

-- 3. Adicionar coluna trial_used na tabela resellers
SET @col_exists = (
    SELECT COUNT(*) 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'resellers'
      AND COLUMN_NAME = 'trial_used'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE resellers ADD COLUMN trial_used BOOLEAN DEFAULT FALSE COMMENT ''Indica se o usuário já usou o trial''',
    'SELECT ''Coluna trial_used já existe'' AS info'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. Adicionar coluna account_status na tabela resellers
SET @col_exists = (
    SELECT COUNT(*) 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'resellers'
      AND COLUMN_NAME = 'account_status'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE resellers ADD COLUMN account_status ENUM(''active'', ''trial'', ''expired'', ''suspended'') DEFAULT ''trial'' COMMENT ''Status da conta do revendedor''',
    'SELECT ''Coluna account_status já existe'' AS info'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5. Atualizar status das contas existentes
UPDATE resellers
SET account_status = CASE
    WHEN is_admin = 1 THEN 'active'
    WHEN subscription_expiry_date IS NULL THEN 'expired'
    WHEN subscription_expiry_date < NOW() THEN 'expired'
    WHEN subscription_plan_id = 'plan_trial' THEN 'trial'
    ELSE 'active'
END
WHERE account_status IS NULL OR account_status = 'trial';

-- 6. Criar índices para performance (ignorar se já existirem)
SET @idx_exists = (
    SELECT COUNT(*) 
    FROM information_schema.STATISTICS 
    WHERE TABLE_SCHEMA = DATABAS

-- ============================================
-- VERIFICAÇÃO
-- ============================================

SELECT '=== PLANO TRIAL CRIADO ===' as info;
SELECT * FROM reseller_subscription_plans WHERE id = 'plan_trial';

SELECT '=== ESTRUTURA ATUALIZADA ===' as info;
DESCRIBE resellers;

SELECT '=== STATUS DAS CONTAS ===' as info;
SELECT 
    id,
    display_name,
    email,
    account_status,
    subscription_plan_id,
    subscription_expiry_date,
    trial_used,
    is_admin
FROM resellers
ORDER BY is_admin DESC, account_status;

-- ============================================
-- FIM
-- ============================================
