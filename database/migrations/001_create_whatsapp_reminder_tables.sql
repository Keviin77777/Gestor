-- Migration: Create WhatsApp Reminder System Tables
-- Version: 001
-- Description: Creates tables for WhatsApp reminder templates, logs, and settings

-- Tabela para templates de lembrete
CREATE TABLE IF NOT EXISTS whatsapp_reminder_templates (
    id VARCHAR(36) PRIMARY KEY,
    reseller_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    reminder_type ENUM('before', 'on_due', 'after') NOT NULL,
    days_offset INT NOT NULL COMMENT 'Positivo para antes, negativo para depois do vencimento',
    is_active BOOLEAN DEFAULT TRUE,
    send_hour INT NULL COMMENT 'Hora específica para envio (0-23), NULL usa configuração global',
    send_minute INT DEFAULT 0 COMMENT 'Minuto específico para envio (0-59)',
    use_global_schedule BOOLEAN DEFAULT TRUE COMMENT 'Se deve usar horário global ou específico',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Índices para performance
    INDEX idx_reseller_active (reseller_id, is_active),
    INDEX idx_type_days (reminder_type, days_offset),
    INDEX idx_reseller_type (reseller_id, reminder_type),
    
    -- Constraints
    CONSTRAINT fk_reminder_template_reseller 
        FOREIGN KEY (reseller_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_days_offset_range 
        CHECK (days_offset BETWEEN -30 AND 30),
    CONSTRAINT chk_days_offset_logic 
        CHECK (
            (reminder_type = 'before' AND days_offset > 0) OR
            (reminder_type = 'on_due' AND days_offset = 0) OR
            (reminder_type = 'after' AND days_offset < 0)
        ),
    CONSTRAINT chk_send_hour_range 
        CHECK (send_hour IS NULL OR (send_hour >= 0 AND send_hour <= 23)),
    CONSTRAINT chk_send_minute_range 
        CHECK (send_minute >= 0 AND send_minute <= 59)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela para logs de lembretes enviados
CREATE TABLE IF NOT EXISTS whatsapp_reminder_logs (
    id VARCHAR(36) PRIMARY KEY,
    reseller_id VARCHAR(36) NOT NULL,
    client_id VARCHAR(36) NOT NULL,
    template_id VARCHAR(36) NOT NULL,
    message_content TEXT NOT NULL,
    scheduled_date DATE NOT NULL,
    sent_at TIMESTAMP NULL,
    status ENUM('pending', 'sent', 'failed', 'cancelled') DEFAULT 'pending',
    error_message TEXT NULL,
    retry_count INT DEFAULT 0,
    whatsapp_message_id VARCHAR(255) NULL COMMENT 'ID da mensagem no WhatsApp',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Índices para performance
    INDEX idx_client_date (client_id, scheduled_date),
    INDEX idx_status_scheduled (status, scheduled_date),
    INDEX idx_reseller_date (reseller_id, scheduled_date),
    INDEX idx_template_status (template_id, status),
    INDEX idx_retry_pending (status, retry_count, scheduled_date),
    
    -- Constraints
    CONSTRAINT fk_reminder_log_reseller 
        FOREIGN KEY (reseller_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_reminder_log_client 
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    CONSTRAINT fk_reminder_log_template 
        FOREIGN KEY (template_id) REFERENCES whatsapp_reminder_templates(id) ON DELETE CASCADE,
    CONSTRAINT chk_retry_count 
        CHECK (retry_count >= 0 AND retry_count <= 5),
    CONSTRAINT chk_sent_at_logic 
        CHECK (
            (status = 'sent' AND sent_at IS NOT NULL) OR
            (status != 'sent' AND (sent_at IS NULL OR sent_at IS NOT NULL))
        )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela para configurações globais de lembretes por revendedor
CREATE TABLE IF NOT EXISTS whatsapp_reminder_settings (
    reseller_id VARCHAR(36) PRIMARY KEY,
    is_enabled BOOLEAN DEFAULT TRUE,
    start_hour INT DEFAULT 8 COMMENT 'Hora de início (0-23)',
    end_hour INT DEFAULT 18 COMMENT 'Hora de fim (0-23)',
    working_days VARCHAR(20) DEFAULT '1,2,3,4,5,6' COMMENT 'Dias da semana (1=Segunda, 7=Domingo)',
    check_interval_minutes INT DEFAULT 60 COMMENT 'Intervalo de verificação em minutos',
    max_daily_reminders INT DEFAULT 100 COMMENT 'Máximo de lembretes por dia',
    timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT fk_reminder_settings_reseller 
        FOREIGN KEY (reseller_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_hours_range 
        CHECK (start_hour >= 0 AND start_hour <= 23 AND end_hour >= 0 AND end_hour <= 23),
    CONSTRAINT chk_hours_logic 
        CHECK (start_hour < end_hour OR (start_hour = end_hour AND start_hour = 0)),
    CONSTRAINT chk_check_interval 
        CHECK (check_interval_minutes >= 5 AND check_interval_minutes <= 1440),
    CONSTRAINT chk_max_daily_reminders 
        CHECK (max_daily_reminders > 0 AND max_daily_reminders <= 1000)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inserir configurações padrão para usuários existentes
INSERT IGNORE INTO whatsapp_reminder_settings (reseller_id)
SELECT id FROM users WHERE id IS NOT NULL;

-- Criar índices compostos adicionais para otimização
CREATE INDEX idx_reminder_logs_processing ON whatsapp_reminder_logs (status, scheduled_date, retry_count);
CREATE INDEX idx_reminder_logs_cleanup ON whatsapp_reminder_logs (created_at, status);
CREATE INDEX idx_reminder_templates_active ON whatsapp_reminder_templates (reseller_id, is_active, reminder_type);

-- Comentários para documentação
ALTER TABLE whatsapp_reminder_templates COMMENT = 'Templates de lembretes automáticos do WhatsApp';
ALTER TABLE whatsapp_reminder_logs COMMENT = 'Logs de lembretes enviados e agendados';
ALTER TABLE whatsapp_reminder_settings COMMENT = 'Configurações globais do sistema de lembretes por revendedor';