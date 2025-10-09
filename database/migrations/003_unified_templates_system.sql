-- Migration: Unified Templates System
-- Version: 003
-- Description: Unifica sistema de templates manuais e automáticos com suporte a eventos

-- Criar nova tabela unificada de templates
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id VARCHAR(50) PRIMARY KEY,
  reseller_id VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  type ENUM('welcome', 'invoice', 'renewal', 'reminder_before', 'reminder_due', 'reminder_after', 'data_send', 'payment_link', 'custom') NOT NULL,
  trigger_event VARCHAR(50) COMMENT 'user_created, invoice_generated, invoice_paid, scheduled, manual',
  message TEXT NOT NULL,
  
  -- Mídia
  has_media BOOLEAN DEFAULT FALSE,
  media_url VARCHAR(500),
  media_type ENUM('image', 'video', 'document', 'audio') DEFAULT NULL,
  
  -- Configurações
  is_default BOOLEAN DEFAULT FALSE COMMENT 'Template padrão do sistema (não pode ser deletado)',
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Agendamento (para lembretes)
  days_offset INT COMMENT 'Dias antes/depois do vencimento (positivo=antes, negativo=depois, 0=no dia)',
  send_hour INT COMMENT 'Hora específica para envio (0-23)',
  send_minute INT DEFAULT 0 COMMENT 'Minuto específico para envio (0-59)',
  use_global_schedule BOOLEAN DEFAULT TRUE COMMENT 'Usar horário global ou específico',
  
  -- Metadados
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Índices
  INDEX idx_reseller (reseller_id),
  INDEX idx_type (type),
  INDEX idx_trigger (trigger_event),
  INDEX idx_active (is_active),
  INDEX idx_default (is_default),
  
  -- Constraints
  CONSTRAINT chk_templates_send_hour CHECK (send_hour IS NULL OR (send_hour >= 0 AND send_hour <= 23)),
  CONSTRAINT chk_templates_send_minute CHECK (send_minute >= 0 AND send_minute <= 59)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Criar tabela de eventos do sistema
CREATE TABLE IF NOT EXISTS whatsapp_system_events (
  id VARCHAR(50) PRIMARY KEY,
  reseller_id VARCHAR(50) NOT NULL,
  event_type VARCHAR(50) NOT NULL COMMENT 'user_created, invoice_generated, invoice_paid, etc',
  entity_id VARCHAR(50) NOT NULL COMMENT 'ID do cliente, fatura, etc',
  entity_type VARCHAR(50) NOT NULL COMMENT 'client, invoice, user, etc',
  event_data JSON COMMENT 'Dados adicionais do evento',
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_reseller (reseller_id),
  INDEX idx_event_type (event_type),
  INDEX idx_processed (processed),
  INDEX idx_entity (entity_id, entity_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Atualizar tabela de logs para referenciar novos templates
-- (Comentado pois a coluna já pode existir)
-- ALTER TABLE whatsapp_reminder_logs 
-- ADD COLUMN event_id VARCHAR(50) COMMENT 'ID do evento que gerou este envio',
-- ADD INDEX idx_event (event_id);

-- Comentários nas tabelas
ALTER TABLE whatsapp_templates COMMENT = 'Templates unificados de WhatsApp (manuais e automáticos)';
ALTER TABLE whatsapp_system_events COMMENT = 'Eventos do sistema que disparam templates automáticos';
