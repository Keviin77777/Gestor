-- Migration: Add Template-Specific Scheduling
-- Version: 002
-- Description: Adds scheduling fields to reminder templates for specific send times

-- Add new columns to whatsapp_reminder_templates
ALTER TABLE whatsapp_reminder_templates 
ADD COLUMN send_hour INT NULL COMMENT 'Hora específica para envio (0-23), NULL usa configuração global' AFTER is_active,
ADD COLUMN send_minute INT DEFAULT 0 COMMENT 'Minuto específico para envio (0-59)' AFTER send_hour,
ADD COLUMN use_global_schedule BOOLEAN DEFAULT TRUE COMMENT 'Se deve usar horário global ou específico' AFTER send_minute;

-- Add constraints for the new fields
ALTER TABLE whatsapp_reminder_templates 
ADD CONSTRAINT chk_send_hour_range 
    CHECK (send_hour IS NULL OR (send_hour >= 0 AND send_hour <= 23)),
ADD CONSTRAINT chk_send_minute_range 
    CHECK (send_minute >= 0 AND send_minute <= 59);

-- Add index for scheduling queries
CREATE INDEX idx_template_scheduling ON whatsapp_reminder_templates (use_global_schedule, send_hour, send_minute);

-- Update existing templates to use global schedule by default
UPDATE whatsapp_reminder_templates 
SET use_global_schedule = TRUE, send_minute = 0 
WHERE use_global_schedule IS NULL;