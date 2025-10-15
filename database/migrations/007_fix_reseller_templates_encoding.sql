-- ============================================================================
-- Fix: Corrigir encoding dos templates de revendedores
-- ============================================================================

USE iptv_manager;

-- Deletar templates corrompidos
DELETE FROM reseller_whatsapp_templates;

-- Reinserir com encoding correto (UTF-8)
INSERT INTO reseller_whatsapp_templates (id, name, trigger_type, message, is_active, created_by) VALUES
(
  'tpl_reseller_7days',
  'Assinatura vence em 7 dias',
  'expiring_7days',
  '⚠️ *Atenção {{revenda_nome}}!*

Sua assinatura do *{{plano_nome}}* vence em *7 dias*!

📅 Vencimento: {{data_vencimento}}
💰 Valor para renovar: R$ {{valor}}

🔄 Renove agora e mantenha seu acesso:
{{link_renovacao}}

Não perca o acesso ao seu painel de gestão!',
  TRUE,
  'admin-user-001'
),
(
  'tpl_reseller_3days',
  'Assinatura vence em 3 dias',
  'expiring_3days',
  '🚨 *URGENTE {{revenda_nome}}!*

Sua assinatura vence em apenas *3 dias*!

📅 Vencimento: {{data_vencimento}}
💰 Valor: R$ {{valor}}

⚡ Renove AGORA para não perder o acesso:
{{link_renovacao}}

Evite interrupções no seu negócio!',
  TRUE,
  'admin-user-001'
),
(
  'tpl_reseller_1day',
  'Assinatura vence AMANHÃ',
  'expiring_1day',
  '🔴 *ÚLTIMA CHANCE {{revenda_nome}}!*

Sua assinatura vence *AMANHÃ*!

📅 Vencimento: {{data_vencimento}}
💰 Valor: R$ {{valor}}

⚡ RENOVE AGORA:
{{link_renovacao}}

Não deixe para última hora!',
  TRUE,
  'admin-user-001'
),
(
  'tpl_reseller_expired',
  'Assinatura VENCIDA',
  'expired',
  '❌ *ASSINATURA VENCIDA - {{revenda_nome}}*

Sua assinatura do GestPlay está *VENCIDA*!

📅 Venceu em: {{data_vencimento}}
💰 Renove por: R$ {{valor}}

🔄 Renovar agora:
{{link_renovacao}}

Recupere o acesso ao seu painel imediatamente!',
  TRUE,
  'admin-user-001'
),
(
  'tpl_reseller_confirmed',
  'Pagamento Confirmado',
  'payment_confirmed',
  '✅ *PAGAMENTO CONFIRMADO!*

Olá {{revenda_nome}}!

Seu pagamento foi confirmado com sucesso! 🎉

📦 Plano: {{plano_nome}}
💰 Valor: R$ {{valor}}
📅 Válido até: {{data_vencimento}}

Seu acesso está ativo e renovado!

Obrigado por confiar no GestPlay! 🚀',
  TRUE,
  'admin-user-001'
),
(
  'tpl_reseller_welcome',
  'Boas-vindas Revenda',
  'welcome',
  '🎉 *Bem-vindo ao GestPlay!*

Olá {{revenda_nome}}!

Sua conta foi criada com sucesso!

📧 Email: {{revenda_email}}
📅 Assinatura válida até: {{data_vencimento}}

Acesse seu painel:
http://localhost:9002

Qualquer dúvida, estamos à disposição!',
  TRUE,
  'admin-user-001'
);

SELECT 'Templates de revendedores corrigidos com sucesso!' as status;
SELECT COUNT(*) as total_templates FROM reseller_whatsapp_templates;
