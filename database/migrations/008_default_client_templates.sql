-- ============================================================================
-- Templates Padrão para Revendas (Mensagens para Clientes)
-- ============================================================================

-- Inserir templates padrão para cada revenda quando ela for criada
-- Estes templates servem como exemplo e podem ser editados

-- Template: Boas-vindas ao Cliente
INSERT INTO whatsapp_reminder_templates (
  id, 
  reseller_id, 
  name, 
  type, 
  trigger_event, 
  message, 
  is_default, 
  is_active,
  days_offset,
  send_hour,
  send_minute,
  use_global_schedule
) VALUES (
  CONCAT('tpl_welcome_', UUID()),
  '{{RESELLER_ID}}',
  'Boas-vindas ao Cliente',
  'welcome',
  'user_created',
  '🎉 *Bem-vindo!*

Olá {{cliente_nome}}! 👋

Sua conta foi criada com sucesso!

📱 *Seus Dados de Acesso:*
👤 Usuário: {{cliente_usuario}}
🔑 Senha: {{senha}}
📦 Plano: {{plano}}
💰 Valor: R$ {{valor}}
📅 Vencimento: {{data_vencimento}}

Qualquer dúvida, estamos à disposição! 😊',
  TRUE,
  TRUE,
  0,
  9,
  0,
  TRUE
);

-- Template: Lembrete 3 dias antes do vencimento
INSERT INTO whatsapp_reminder_templates (
  id, 
  reseller_id, 
  name, 
  type, 
  trigger_event, 
  message, 
  is_default, 
  is_active,
  days_offset,
  send_hour,
  send_minute,
  use_global_schedule
) VALUES (
  CONCAT('tpl_reminder_3days_', UUID()),
  '{{RESELLER_ID}}',
  'Lembrete 3 Dias Antes',
  'reminder_before',
  'scheduled',
  '⏰ *Lembrete de Renovação*

Olá {{cliente_nome}}!

Sua assinatura vence em *3 dias* ({{data_vencimento}}).

💰 Valor: R$ {{valor}}

Para manter seu acesso ativo, realize o pagamento até a data de vencimento.

Obrigado pela preferência! 🙏',
  TRUE,
  TRUE,
  -3,
  9,
  0,
  TRUE
);

-- Template: Lembrete no dia do vencimento
INSERT INTO whatsapp_reminder_templates (
  id, 
  reseller_id, 
  name, 
  type, 
  trigger_event, 
  message, 
  is_default, 
  is_active,
  days_offset,
  send_hour,
  send_minute,
  use_global_schedule
) VALUES (
  CONCAT('tpl_reminder_due_', UUID()),
  '{{RESELLER_ID}}',
  'Lembrete Dia do Vencimento',
  'reminder_due',
  'scheduled',
  '📅 *Vencimento Hoje*

Olá {{cliente_nome}}!

Sua assinatura vence *hoje* ({{data_vencimento}}).

💰 Valor: R$ {{valor}}

Realize o pagamento para manter seu acesso ativo.

Evite interrupções no serviço! ⚡',
  TRUE,
  TRUE,
  0,
  9,
  0,
  TRUE
);

-- Template: Lembrete após vencimento
INSERT INTO whatsapp_reminder_templates (
  id, 
  reseller_id, 
  name, 
  type, 
  trigger_event, 
  message, 
  is_default, 
  is_active,
  days_offset,
  send_hour,
  send_minute,
  use_global_schedule
) VALUES (
  CONCAT('tpl_reminder_after_', UUID()),
  '{{RESELLER_ID}}',
  'Lembrete Após Vencimento',
  'reminder_after',
  'scheduled',
  '⚠️ *Assinatura Vencida*

Olá {{cliente_nome}},

Sua assinatura venceu em {{data_vencimento}}.

💰 Valor: R$ {{valor}}

Regularize seu pagamento para reativar seu acesso.

Estamos aguardando! 🙏',
  TRUE,
  TRUE,
  1,
  9,
  0,
  TRUE
);

-- Template: Renovação confirmada
INSERT INTO whatsapp_reminder_templates (
  id, 
  reseller_id, 
  name, 
  type, 
  trigger_event, 
  message, 
  is_default, 
  is_active,
  days_offset,
  send_hour,
  send_minute,
  use_global_schedule
) VALUES (
  CONCAT('tpl_renewal_', UUID()),
  '{{RESELLER_ID}}',
  'Renovação Confirmada',
  'renewal',
  'invoice_paid',
  '✅ *Pagamento Confirmado!*

Olá {{cliente_nome}}!

Seu pagamento foi confirmado com sucesso! 🎉

📦 Plano: {{plano}}
💰 Valor: R$ {{valor}}
📅 Próximo vencimento: {{data_vencimento}}

Obrigado pela confiança! 😊',
  TRUE,
  TRUE,
  0,
  9,
  0,
  TRUE
);

-- Template: Link de Pagamento
INSERT INTO whatsapp_reminder_templates (
  id, 
  reseller_id, 
  name, 
  type, 
  trigger_event, 
  message, 
  is_default, 
  is_active,
  days_offset,
  send_hour,
  send_minute,
  use_global_schedule
) VALUES (
  CONCAT('tpl_payment_link_', UUID()),
  '{{RESELLER_ID}}',
  'Envio de Link de Pagamento',
  'payment_link',
  'invoice_generated',
  '💳 *Link de Pagamento*

Olá {{cliente_nome}}!

Sua fatura está disponível:

💰 Valor: R$ {{valor}}
📅 Vencimento: {{data_vencimento}}

🔗 *Pagar agora:*
{{link_pagamento}}

Pague com PIX, Cartão ou Boleto! 🚀',
  TRUE,
  TRUE,
  0,
  9,
  0,
  TRUE
);
