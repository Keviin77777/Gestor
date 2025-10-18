-- ============================================
-- DIAGNÓSTICO DO BANCO DE DADOS
-- Execute para verificar o estado atual
-- ============================================

USE iptv_manager;

-- ============================================
-- 1. VERIFICAR SE O BANCO EXISTE
-- ============================================
SELECT '=== 1. BANCO DE DADOS ===' as info;
SELECT DATABASE() as banco_atual;

-- ============================================
-- 2. VERIFICAR TABELAS EXISTENTES
-- ============================================
SELECT '=== 2. TABELAS EXISTENTES ===' as info;
SHOW TABLES;

-- ============================================
-- 3. ESTRUTURA DA TABELA RESELLERS
-- ============================================
SELECT '=== 3. ESTRUTURA DA TABELA RESELLERS ===' as info;
DESCRIBE resellers;

-- ============================================
-- 4. VERIFICAR SE COLUNA WHATSAPP EXISTE
-- ============================================
SELECT '=== 4. VERIFICAÇÃO DA COLUNA WHATSAPP ===' as info;

SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Coluna whatsapp EXISTE'
        ELSE '❌ Coluna whatsapp NÃO EXISTE - Execute run-migrations.bat'
    END as status,
    COUNT(*) as encontrada
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'resellers'
  AND COLUMN_NAME = 'whatsapp';

-- ============================================
-- 5. LISTAR TODAS AS COLUNAS DA TABELA RESELLERS
-- ============================================
SELECT '=== 5. TODAS AS COLUNAS DA TABELA RESELLERS ===' as info;

SELECT 
    COLUMN_NAME as coluna,
    DATA_TYPE as tipo,
    IS_NULLABLE as permite_null,
    COLUMN_DEFAULT as valor_padrao,
    COLUMN_COMMENT as comentario
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'resellers'
ORDER BY ORDINAL_POSITION;

-- ============================================
-- 6. VERIFICAR ÍNDICES
-- ============================================
SELECT '=== 6. ÍNDICES DA TABELA RESELLERS ===' as info;

SELECT 
    INDEX_NAME as indice,
    COLUMN_NAME as coluna,
    NON_UNIQUE as nao_unico
FROM information_schema.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'resellers'
ORDER BY INDEX_NAME, SEQ_IN_INDEX;

-- ============================================
-- 7. CONTAR REGISTROS
-- ============================================
SELECT '=== 7. QUANTIDADE DE REGISTROS ===' as info;

SELECT COUNT(*) as total_resellers FROM resellers;

-- ============================================
-- 8. VERIFICAR ÚLTIMOS REGISTROS
-- ============================================
SELECT '=== 8. ÚLTIMOS 5 REGISTROS ===' as info;

SELECT 
    id,
    email,
    display_name,
    created_at
FROM resellers 
ORDER BY created_at DESC 
LIMIT 5;

-- ============================================
-- FIM DO DIAGNÓSTICO
-- ============================================

SELECT '=== ✅ DIAGNÓSTICO COMPLETO ===' as info;
