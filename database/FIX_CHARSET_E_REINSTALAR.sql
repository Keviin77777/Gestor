-- ============================================================================
-- FIX CHARSET E REINSTALAÇÃO COMPLETA
-- ============================================================================

-- Configurar charset do banco
ALTER DATABASE ultragestor_db CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Desabilitar verificação de foreign keys
SET FOREIGN_KEY_CHECKS = 0;

-- Dropar todas as tabelas (para recriar com charset correto)
DROP TABLE IF EXISTS whatsapp_reminder_logs;
DROP TABLE IF EXISTS whatsapp_reminder_templates;
DROP TABLE IF EXISTS password_reset_tokens;
DROP TABLE IF EXISTS subscription_payments;
DROP TABLE IF EXISTS reseller_subscriptions;
DROP TABLE IF EXISTS subscription_plans;
DROP TABLE IF EXISTS payment_methods;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS clients;
DROP TABLE IF EXISTS plans;
DROP TABLE IF EXISTS panels;
DROP TABLE IF EXISTS resellers;
DROP TABLE IF EXISTS users;

-- Reabilitar verificação de foreign keys
SET FOREIGN_KEY_CHECKS = 1;

-- Agora executar o INSTALAR_COMPLETO.sql
SOURCE database/INSTALAR_COMPLETO.sql;
