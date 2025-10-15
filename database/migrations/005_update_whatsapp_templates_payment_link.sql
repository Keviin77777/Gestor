-- ============================================================================
-- Migration: Update WhatsApp Templates with Payment Link Variable
-- Version: 005
-- Description: Adiciona variável {{link_fatura}} nos templates
-- ============================================================================

-- Atualizar template de fatura disponível para incluir link de pagamento
UPDATE whatsapp_templates 
SET message = CONCAT(
    message,
    '\n\n🔗 Pagar agora:\n{{link_fatura}}\n\nPagamento via PIX instantâneo! ⚡'
)
WHERE trigger_event = 'invoice_generated' 
AND message NOT LIKE '%{{link_fatura}}%';

-- Verificar templates atualizados
SELECT 
    id,
    name,
    trigger_event,
    LEFT(message, 100) as message_preview,
    CASE 
        WHEN message LIKE '%{{link_fatura}}%' THEN '✅ Atualizado'
        ELSE '❌ Não atualizado'
    END as status
FROM whatsapp_templates
WHERE trigger_event IN ('invoice_generated', 'invoice_paid');

-- ============================================================================
-- Exemplo de template completo com link de pagamento
-- ============================================================================

/*
Olá {{cliente_nome}}! 👋

Sua fatura está disponível:

💰 Valor: R$ {{valor}}
📅 Vencimento: {{data_vencimento}}
📦 Plano: {{plano}}

🔗 Pagar agora:
{{link_fatura}}

Pagamento via PIX instantâneo! ⚡
*/

-- ============================================================================
-- Variáveis disponíveis nos templates
-- ============================================================================

/*
TEMPLATE: invoice_generated (Fatura Disponível)
- {{cliente_nome}} - Nome do cliente
- {{valor}} - Valor da fatura
- {{data_vencimento}} - Data de vencimento
- {{plano}} - Nome do plano
- {{link_fatura}} - Link para pagamento (NOVO)

TEMPLATE: invoice_paid (Renovação Confirmada)
- {{cliente_nome}} - Nome do cliente
- {{data_vencimento}} - Próxima data de vencimento
- {{valor}} - Valor pago
- {{plano}} - Nome do plano

TEMPLATE: scheduled (Lembretes)
- {{cliente_nome}} - Nome do cliente
- {{data_vencimento}} - Data de vencimento
- {{dias_vencimento}} - Dias até/após vencimento
- {{valor}} - Valor da fatura
- {{plano}} - Nome do plano
*/

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
