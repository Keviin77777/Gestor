-- Script para limpar logs de lembretes para testes
-- Execute este script no MySQL para limpar os logs e testar a funcionalidade

-- Desabilitar modo seguro temporariamente
SET SQL_SAFE_UPDATES = 0;

-- Limpar todos os logs de lembretes de hoje
DELETE FROM whatsapp_reminder_logs 
WHERE DATE(created_at) = CURDATE();

-- Verificar se foi limpo
SELECT COUNT(*) as logs_restantes_hoje 
FROM whatsapp_reminder_logs 
WHERE DATE(created_at) = CURDATE();

-- Opcional: Limpar todos os logs (cuidado em produção!)
-- DELETE FROM whatsapp_reminder_logs;

-- Reabilitar modo seguro
SET SQL_SAFE_UPDATES = 1;

-- Verificar logs por reseller
SELECT 
    reseller_id,
    DATE(created_at) as data,
    status,
    COUNT(*) as quantidade
FROM whatsapp_reminder_logs 
GROUP BY reseller_id, DATE(created_at), status
ORDER BY DATE(created_at) DESC;

-- Mostrar logs de hoje detalhados
SELECT 
    wrl.reseller_id,
    c.name as cliente,
    wt.name as template,
    wrl.status,
    wrl.created_at,
    wrl.sent_at,
    wrl.error_message
FROM whatsapp_reminder_logs wrl
LEFT JOIN clients c ON wrl.client_id = c.id
LEFT JOIN whatsapp_templates wt ON wrl.template_id = wt.id
WHERE DATE(wrl.created_at) = CURDATE()
ORDER BY wrl.created_at DESC;