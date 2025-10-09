-- ============================================================================
-- IPTV Revenue Manager - MySQL Database Schema
-- Security Level: Enterprise Grade
-- ============================================================================

-- Drop existing database if exists (CAUTION: Use only in development)
-- DROP DATABASE IF EXISTS iptv_manager;

CREATE DATABASE IF NOT EXISTS iptv_manager 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE iptv_manager;

-- ============================================================================
-- TABLE: resellers
-- Stores reseller account information
-- ============================================================================
CREATE TABLE resellers (
  id VARCHAR(128) PRIMARY KEY COMMENT 'Firebase UID or generated UUID',
  email VARCHAR(255) NOT NULL UNIQUE,
  email_verified BOOLEAN DEFAULT FALSE,
  display_name VARCHAR(255),
  photo_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL,
  is_active BOOLEAN DEFAULT TRUE,
  
  INDEX idx_email (email),
  INDEX idx_created_at (created_at),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: clients
-- Stores IPTV client information for each reseller
-- ============================================================================
CREATE TABLE clients (
  id VARCHAR(36) PRIMARY KEY,
  reseller_id VARCHAR(128) NOT NULL,
  name VARCHAR(255) NOT NULL,
  username VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(50),
  plan_id VARCHAR(36),
  panel_id VARCHAR(36),
  start_date DATE NOT NULL,
  renewal_date DATE NOT NULL,
  status ENUM('active', 'inactive', 'suspended', 'expired') DEFAULT 'active',
  value DECIMAL(10, 2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (reseller_id) REFERENCES resellers(id) ON DELETE CASCADE,
  INDEX idx_reseller_id (reseller_id),
  INDEX idx_status (status),
  INDEX idx_renewal_date (renewal_date),
  INDEX idx_plan_id (plan_id),
  INDEX idx_panel_id (panel_id),
  INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: panels
-- Stores IPTV panel information
-- ============================================================================
CREATE TABLE panels (
  id VARCHAR(36) PRIMARY KEY,
  reseller_id VARCHAR(128) NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100),
  url TEXT,
  login VARCHAR(255),
  password_encrypted TEXT COMMENT 'Encrypted password',
  monthly_cost DECIMAL(10, 2) DEFAULT 0.00,
  sigma_connected BOOLEAN DEFAULT FALSE,
  sigma_url TEXT,
  sigma_username VARCHAR(255),
  sigma_password_encrypted TEXT COMMENT 'Encrypted Sigma password',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (reseller_id) REFERENCES resellers(id) ON DELETE CASCADE,
  INDEX idx_reseller_id (reseller_id),
  INDEX idx_sigma_connected (sigma_connected)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: plans
-- Stores subscription plans
-- ============================================================================
CREATE TABLE plans (
  id VARCHAR(36) PRIMARY KEY,
  reseller_id VARCHAR(128) NOT NULL,
  panel_id VARCHAR(36),
  name VARCHAR(255) NOT NULL,
  value DECIMAL(10, 2) NOT NULL,
  duration_days INT NOT NULL DEFAULT 30,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (reseller_id) REFERENCES resellers(id) ON DELETE CASCADE,
  FOREIGN KEY (panel_id) REFERENCES panels(id) ON DELETE SET NULL,
  INDEX idx_reseller_id (reseller_id),
  INDEX idx_panel_id (panel_id),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: expenses
-- Stores business expenses
-- ============================================================================
CREATE TABLE expenses (
  id VARCHAR(36) PRIMARY KEY,
  reseller_id VARCHAR(128) NOT NULL,
  date DATE NOT NULL,
  value DECIMAL(10, 2) NOT NULL,
  type ENUM('fixed', 'variable', 'panel', 'app', 'tool', 'credit', 'license', 'other') NOT NULL,
  category VARCHAR(100),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (reseller_id) REFERENCES resellers(id) ON DELETE CASCADE,
  INDEX idx_reseller_id (reseller_id),
  INDEX idx_date (date),
  INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: revenues
-- Stores revenue records
-- ============================================================================
CREATE TABLE revenues (
  id VARCHAR(36) PRIMARY KEY,
  reseller_id VARCHAR(128) NOT NULL,
  client_id VARCHAR(36),
  date DATE NOT NULL,
  value DECIMAL(10, 2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (reseller_id) REFERENCES resellers(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
  INDEX idx_reseller_id (reseller_id),
  INDEX idx_client_id (client_id),
  INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: notifications
-- Stores system notifications
-- ============================================================================
CREATE TABLE notifications (
  id VARCHAR(36) PRIMARY KEY,
  reseller_id VARCHAR(128) NOT NULL,
  type ENUM('expiring_client', 'expired_client', 'expiring_panel', 'payment_due', 'system', 'other') NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP NULL,
  
  FOREIGN KEY (reseller_id) REFERENCES resellers(id) ON DELETE CASCADE,
  INDEX idx_reseller_id (reseller_id),
  INDEX idx_is_read (is_read),
  INDEX idx_created_at (created_at),
  INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: invoices
-- Stores invoice records
-- ============================================================================
CREATE TABLE invoices (
  id VARCHAR(36) PRIMARY KEY,
  reseller_id VARCHAR(128) NOT NULL,
  client_id VARCHAR(36),
  invoice_number VARCHAR(100) UNIQUE,
  issue_date DATE NOT NULL COMMENT 'Data de emissão da fatura',
  due_date DATE NOT NULL COMMENT 'Data de vencimento',
  value DECIMAL(10, 2) NOT NULL COMMENT 'Valor original da fatura',
  discount DECIMAL(10, 2) DEFAULT 0.00 COMMENT 'Valor do desconto',
  final_value DECIMAL(10, 2) NOT NULL COMMENT 'Valor final após desconto',
  status ENUM('pending', 'paid', 'overdue', 'cancelled') DEFAULT 'pending',
  payment_date DATE NULL COMMENT 'Data do pagamento',
  payment_method VARCHAR(100) NULL COMMENT 'Método de pagamento',
  description TEXT COMMENT 'Descrição da fatura',
  notes TEXT COMMENT 'Observações adicionais',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (reseller_id) REFERENCES resellers(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
  INDEX idx_reseller_id (reseller_id),
  INDEX idx_client_id (client_id),
  INDEX idx_status (status),
  INDEX idx_issue_date (issue_date),
  INDEX idx_due_date (due_date),
  INDEX idx_payment_date (payment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: apps
-- Stores app/application information
-- ============================================================================
CREATE TABLE apps (
  id VARCHAR(36) PRIMARY KEY,
  reseller_id VARCHAR(128) NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100),
  monthly_cost DECIMAL(10, 2) DEFAULT 0.00,
  url TEXT,
  login VARCHAR(255),
  password_encrypted TEXT COMMENT 'Encrypted password',
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (reseller_id) REFERENCES resellers(id) ON DELETE CASCADE,
  INDEX idx_reseller_id (reseller_id),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: audit_logs
-- Security audit trail for all critical operations
-- ============================================================================
CREATE TABLE audit_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  reseller_id VARCHAR(128),
  action VARCHAR(100) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  record_id VARCHAR(36),
  old_values JSON,
  new_values JSON,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_reseller_id (reseller_id),
  INDEX idx_action (action),
  INDEX idx_table_name (table_name),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: sessions
-- Secure session management
-- ============================================================================
CREATE TABLE sessions (
  id VARCHAR(128) PRIMARY KEY,
  reseller_id VARCHAR(128) NOT NULL,
  token_hash VARCHAR(255) NOT NULL UNIQUE COMMENT 'SHA-256 hash of JWT token',
  ip_address VARCHAR(45),
  user_agent TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (reseller_id) REFERENCES resellers(id) ON DELETE CASCADE,
  INDEX idx_reseller_id (reseller_id),
  INDEX idx_token_hash (token_hash),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: api_keys
-- API key management for external integrations
-- ============================================================================
CREATE TABLE api_keys (
  id VARCHAR(36) PRIMARY KEY,
  reseller_id VARCHAR(128) NOT NULL,
  key_hash VARCHAR(255) NOT NULL UNIQUE COMMENT 'SHA-256 hash of API key',
  name VARCHAR(255) NOT NULL,
  permissions JSON COMMENT 'Array of allowed permissions',
  last_used_at TIMESTAMP NULL,
  expires_at TIMESTAMP NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (reseller_id) REFERENCES resellers(id) ON DELETE CASCADE,
  INDEX idx_reseller_id (reseller_id),
  INDEX idx_key_hash (key_hash),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- VIEWS: Useful aggregated data views
-- ============================================================================

-- Active clients per reseller
CREATE VIEW v_active_clients AS
SELECT 
  reseller_id,
  COUNT(*) as total_active_clients,
  SUM(value) as monthly_revenue
FROM clients
WHERE status = 'active'
GROUP BY reseller_id;

-- Expiring clients (next 7 days)
CREATE VIEW v_expiring_clients AS
SELECT 
  c.*,
  DATEDIFF(c.renewal_date, CURDATE()) as days_until_expiry
FROM clients c
WHERE c.status = 'active'
  AND c.renewal_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
ORDER BY c.renewal_date ASC;

-- Monthly financial summary
CREATE VIEW v_monthly_summary AS
SELECT 
  r.id as reseller_id,
  DATE_FORMAT(CURDATE(), '%Y-%m') as month,
  COALESCE(SUM(rev.value), 0) as total_revenue,
  COALESCE(SUM(exp.value), 0) as total_expenses,
  COALESCE(SUM(rev.value), 0) - COALESCE(SUM(exp.value), 0) as net_profit
FROM resellers r
LEFT JOIN revenues rev ON r.id = rev.reseller_id 
  AND DATE_FORMAT(rev.date, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m')
LEFT JOIN expenses exp ON r.id = exp.reseller_id 
  AND DATE_FORMAT(exp.date, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m')
GROUP BY r.id;

-- ============================================================================
-- STORED PROCEDURES: Secure data operations
-- ============================================================================

DELIMITER //

-- Procedure to safely create a new client
CREATE PROCEDURE sp_create_client(
  IN p_id VARCHAR(36),
  IN p_reseller_id VARCHAR(128),
  IN p_name VARCHAR(255),
  IN p_username VARCHAR(100),
  IN p_email VARCHAR(255),
  IN p_phone VARCHAR(50),
  IN p_plan_id VARCHAR(36),
  IN p_panel_id VARCHAR(36),
  IN p_start_date DATE,
  IN p_renewal_date DATE,
  IN p_status VARCHAR(20),
  IN p_value DECIMAL(10, 2),
  IN p_notes TEXT
)
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;
  
  START TRANSACTION;
  
  INSERT INTO clients (
    id, reseller_id, name, username, email, phone,
    plan_id, panel_id, start_date, renewal_date,
    status, value, notes
  ) VALUES (
    p_id, p_reseller_id, p_name, p_username, p_email, p_phone,
    p_plan_id, p_panel_id, p_start_date, p_renewal_date,
    p_status, p_value, p_notes
  );
  
  -- Log the action
  INSERT INTO audit_logs (reseller_id, action, table_name, record_id, new_values)
  VALUES (p_reseller_id, 'CREATE', 'clients', p_id, JSON_OBJECT(
    'name', p_name,
    'value', p_value,
    'status', p_status
  ));
  
  COMMIT;
END //

-- Procedure to safely update a client
CREATE PROCEDURE sp_update_client(
  IN p_id VARCHAR(36),
  IN p_reseller_id VARCHAR(128),
  IN p_name VARCHAR(255),
  IN p_username VARCHAR(100),
  IN p_email VARCHAR(255),
  IN p_phone VARCHAR(50),
  IN p_plan_id VARCHAR(36),
  IN p_panel_id VARCHAR(36),
  IN p_renewal_date DATE,
  IN p_status VARCHAR(20),
  IN p_value DECIMAL(10, 2),
  IN p_notes TEXT
)
BEGIN
  DECLARE v_old_values JSON;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;
  
  START TRANSACTION;
  
  -- Capture old values for audit
  SELECT JSON_OBJECT(
    'name', name,
    'value', value,
    'status', status,
    'renewal_date', renewal_date
  ) INTO v_old_values
  FROM clients
  WHERE id = p_id AND reseller_id = p_reseller_id;
  
  UPDATE clients SET
    name = p_name,
    username = p_username,
    email = p_email,
    phone = p_phone,
    plan_id = p_plan_id,
    panel_id = p_panel_id,
    renewal_date = p_renewal_date,
    status = p_status,
    value = p_value,
    notes = p_notes
  WHERE id = p_id AND reseller_id = p_reseller_id;
  
  -- Log the action
  INSERT INTO audit_logs (reseller_id, action, table_name, record_id, old_values, new_values)
  VALUES (p_reseller_id, 'UPDATE', 'clients', p_id, v_old_values, JSON_OBJECT(
    'name', p_name,
    'value', p_value,
    'status', p_status,
    'renewal_date', p_renewal_date
  ));
  
  COMMIT;
END //

-- Procedure to safely delete a client
CREATE PROCEDURE sp_delete_client(
  IN p_id VARCHAR(36),
  IN p_reseller_id VARCHAR(128)
)
BEGIN
  DECLARE v_old_values JSON;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;
  
  START TRANSACTION;
  
  -- Capture old values for audit
  SELECT JSON_OBJECT(
    'name', name,
    'value', value,
    'status', status
  ) INTO v_old_values
  FROM clients
  WHERE id = p_id AND reseller_id = p_reseller_id;
  
  DELETE FROM clients
  WHERE id = p_id AND reseller_id = p_reseller_id;
  
  -- Log the action
  INSERT INTO audit_logs (reseller_id, action, table_name, record_id, old_values)
  VALUES (p_reseller_id, 'DELETE', 'clients', p_id, v_old_values);
  
  COMMIT;
END //

DELIMITER ;

-- ============================================================================
-- TRIGGERS: Automatic data integrity and security
-- ============================================================================

-- Trigger to clean expired sessions
DELIMITER //
CREATE EVENT IF NOT EXISTS clean_expired_sessions
ON SCHEDULE EVERY 1 HOUR
DO
BEGIN
  DELETE FROM sessions WHERE expires_at < NOW();
END //
DELIMITER ;

-- ============================================================================
-- SECURITY: Create dedicated database user with minimal privileges
-- ============================================================================

-- Create application user (replace 'your_secure_password' with a strong password)
-- CREATE USER IF NOT EXISTS 'iptv_app'@'localhost' IDENTIFIED BY 'your_secure_password';

-- Grant only necessary privileges
-- GRANT SELECT, INSERT, UPDATE, DELETE ON iptv_manager.* TO 'iptv_app'@'localhost';
-- GRANT EXECUTE ON PROCEDURE iptv_manager.sp_create_client TO 'iptv_app'@'localhost';
-- GRANT EXECUTE ON PROCEDURE iptv_manager.sp_update_client TO 'iptv_app'@'localhost';
-- GRANT EXECUTE ON PROCEDURE iptv_manager.sp_delete_client TO 'iptv_app'@'localhost';

-- FLUSH PRIVILEGES;

-- ============================================================================
-- INITIAL DATA: System configuration
-- ============================================================================

-- You can add initial configuration data here if needed

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
