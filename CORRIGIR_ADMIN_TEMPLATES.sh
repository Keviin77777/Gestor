#!/bin/bash

echo "=========================================="
echo "🔧 CORRIGINDO ADMIN E TEMPLATES"
echo "=========================================="
echo ""

# 1. GARANTIR QUE admin@admin.com É ADMIN
echo "1️⃣ Configurando admin@admin.com como ADMIN..."
mysql -u ultragestor_db -p'b0d253f4e062e' ultragestor_db << 'SQL'
UPDATE resellers 
SET is_admin = TRUE 
WHERE email = 'admin@admin.com';

SELECT id, email, display_name, is_admin 
FROM resellers 
WHERE email = 'admin@admin.com';
SQL

echo ""
echo "2️⃣ Criando templates padrão para admin@admin.com..."

# Buscar o ID do admin
ADMIN_ID=$(mysql -u ultragestor_db -p'b0d253f4e062e' ultragestor_db -sN -e "SELECT id FROM resellers WHERE email = 'admin@admin.com' LIMIT 1")

if [ -z "$ADMIN_ID" ]; then
    echo "❌ Admin não encontrado!"
    exit 1
fi

echo "✅ Admin ID: $ADMIN_ID"
echo ""

# Criar templates padrão
mysql -u ultragestor_db -p'b0d253f4e062e' ultragestor_db << SQL
-- Deletar templates antigos se existirem
DELETE FROM whatsapp_templates WHERE reseller_id = '$ADMIN_ID' AND is_default = TRUE;

-- Template: Boas-vindas
INSERT INTO whatsapp_templates (
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
  '$ADMIN_ID',
  'Boas-vindas ao Cliente',
  'welcome',
  'user_created',
  '🎉 *Bem-vindo!*\n\nOlá {{cliente_nome}}! 👋\n\nSua conta foi criada com sucesso!\n\n📱 *Seus Dados de Acesso:*\n👤 Usuário: {{cliente_usuario}}\n🔑 Senha: {{senha}}\n📦 Plano: {{plano}}\n💰 Valor: R\$ {{valor}}\n📅 Vencimento: {{data_vencimento}}\n\nQualquer dúvida, estamos à disposição! 😊',
  TRUE,
  TRUE,
  0,
  9,
  0,
  TRUE
);

-- Template: Lembrete 7 dias antes
INSERT INTO whatsapp_templates (
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
  CONCAT('tpl_reminder_7days_', UUID()),
  '$ADMIN_ID',
  'Lembrete 7 Dias Antes',
  'reminder_before',
  'scheduled',
  '⏰ *Lembrete de Renovação*\n\nOlá {{cliente_nome}}!\n\nSua assinatura vence em *7 dias* ({{data_vencimento}}).\n\n💰 Valor: R\$ {{valor}}\n\nPara manter seu acesso ativo, realize o pagamento até a data de vencimento.\n\nObrigado pela preferência! 🙏',
  TRUE,
  TRUE,
  -7,
  9,
  0,
  TRUE
);

-- Template: Lembrete 3 dias antes
INSERT INTO whatsapp_templates (
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
  '$ADMIN_ID',
  'Lembrete 3 Dias Antes',
  'reminder_before',
  'scheduled',
  '⏰ *Lembrete de Renovação*\n\nOlá {{cliente_nome}}!\n\nSua assinatura vence em *3 dias* ({{data_vencimento}}).\n\n💰 Valor: R\$ {{valor}}\n\nPara manter seu acesso ativo, realize o pagamento até a data de vencimento.\n\nObrigado pela preferência! 🙏',
  TRUE,
  TRUE,
  -3,
  9,
  0,
  TRUE
);

-- Template: Lembrete no dia
INSERT INTO whatsapp_templates (
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
  '$ADMIN_ID',
  'Lembrete Dia do Vencimento',
  'reminder_due',
  'scheduled',
  '📅 *Vencimento Hoje*\n\nOlá {{cliente_nome}}!\n\nSua assinatura vence *hoje* ({{data_vencimento}}).\n\n💰 Valor: R\$ {{valor}}\n\nRealize o pagamento para manter seu acesso ativo.\n\nEvite interrupções no serviço! ⚡',
  TRUE,
  TRUE,
  0,
  9,
  0,
  TRUE
);

-- Template: Após vencimento
INSERT INTO whatsapp_templates (
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
  '$ADMIN_ID',
  'Lembrete Após Vencimento',
  'reminder_after',
  'scheduled',
  '⚠️ *Assinatura Vencida*\n\nOlá {{cliente_nome}},\n\nSua assinatura venceu em {{data_vencimento}}.\n\n💰 Valor: R\$ {{valor}}\n\nRegularize seu pagamento para reativar seu acesso.\n\nEstamos aguardando! 🙏',
  TRUE,
  TRUE,
  1,
  9,
  0,
  TRUE
);

-- Template: Renovação confirmada
INSERT INTO whatsapp_templates (
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
  '$ADMIN_ID',
  'Renovação Confirmada',
  'renewal',
  'invoice_paid',
  '✅ *Pagamento Confirmado!*\n\nOlá {{cliente_nome}}!\n\nSeu pagamento foi confirmado com sucesso! 🎉\n\n📦 Plano: {{plano}}\n💰 Valor: R\$ {{valor}}\n📅 Próximo vencimento: {{data_vencimento}}\n\nObrigado pela confiança! 😊',
  TRUE,
  TRUE,
  0,
  9,
  0,
  TRUE
);

-- Verificar templates criados
SELECT COUNT(*) as total_templates 
FROM whatsapp_templates 
WHERE reseller_id = '$ADMIN_ID';
SQL

echo ""
echo "=========================================="
echo "✅ CORREÇÃO CONCLUÍDA!"
echo "=========================================="
echo ""
echo "📝 Próximos passos:"
echo "1. Faça logout e login novamente"
echo "2. Verifique se o dashboard de ADMIN aparece"
echo "3. Acesse WhatsApp → Templates e veja os templates padrão"
echo ""
