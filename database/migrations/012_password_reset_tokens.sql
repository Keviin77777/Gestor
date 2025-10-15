-- ============================================
-- MIGRATION 012: Sistema de Recuperação de Senha
-- ============================================

USE iptv_manager;

-- Tabela para armazenar tokens de recuperação de senha
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id VARCHAR(36) PRIMARY KEY,
  reseller_id VARCHAR(128) NOT NULL,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP NULL,
  ip_address VARCHAR(45) NULL COMMENT 'IP que solicitou o reset',
  user_agent TEXT NULL COMMENT 'User agent que solicitou',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (reseller_id) REFERENCES resellers(id) ON DELETE CASCADE,
  INDEX idx_token (token),
  INDEX idx_email (email),
  INDEX idx_expires_at (expires_at),
  INDEX idx_used (used)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT = 'Tokens para recuperação de senha';

-- ============================================
-- VERIFICAÇÃO
-- ============================================

SELECT '=== TABELA CRIADA ===' as info;
DESCRIBE password_reset_tokens;

-- ============================================
-- FIM
-- ============================================
