# 🚀 Comandos Úteis - Processors

## 📋 Iniciar Todos os Serviços

### Windows:
```bash
cd scripts
start-all-processors.bat
```

### Linux/Mac:
```bash
cd scripts
chmod +x start-all-processors.sh
./start-all-processors.sh
```

---

## 🧪 Testar Sistema de Bloqueio

```bash
node scripts/test-subscription-block.js
```

**O que testa:**
- Status de cada reseller
- Se está bloqueado ou liberado
- Motivo do bloqueio
- Clientes, lembretes e faturas pendentes

---

## 🔍 Verificar Status dos Serviços

### Health Checks:
```bash
# Reminder Processor
curl http://localhost:3003/health

# Invoice Processor
curl http://localhost:3004/health

# Subscription Processor
curl http://localhost:3005/health

# WhatsApp Server
curl http://localhost:3002/health
```

### Estatísticas:
```bash
# Reminder Processor
curl http://localhost:3003/stats

# Invoice Processor
curl http://localhost:3004/stats
```

---

## 🛑 Parar Serviços

### Windows:
Fechar as janelas do CMD ou usar Task Manager

### Linux/Mac:
```bash
# Parar todos de uma vez (se usou o script)
kill $(cat scripts/.pids/*.pid)

# Ou parar individualmente
pkill -f "reminder-processor"
pkill -f "invoice-processor"
pkill -f "subscription-processor"
pkill -f "whatsapp-server"
pkill -f "whatsapp-connection-monitor"
```

---

## 📊 Monitorar Logs

### Windows (PowerShell):
```powershell
# Ver logs em tempo real
Get-Content -Path "scripts\logs\reminder-processor.log" -Wait -Tail 50
Get-Content -Path "scripts\logs\invoice-processor.log" -Wait -Tail 50
Get-Content -Path "scripts\logs\subscription-processor.log" -Wait -Tail 50
```

### Linux/Mac:
```bash
# Ver logs em tempo real
tail -f scripts/logs/reminder-processor.log
tail -f scripts/logs/invoice-processor.log
tail -f scripts/logs/subscription-processor.log
```

---

## 🔧 Testar Componentes Individuais

### Reminder Processor:
```bash
node scripts/reminder-processor.js
```

### Invoice Processor:
```bash
node scripts/invoice-processor.js
```

### Subscription Processor:
```bash
node scripts/subscription-processor.js
```

### WhatsApp Server:
```bash
node scripts/whatsapp-server.js
```

### WhatsApp Connection Monitor:
```bash
node scripts/whatsapp-connection-monitor.js
```

---

## 🗄️ Comandos de Banco de Dados

### Verificar Assinaturas:
```sql
-- Ver todos os resellers e suas assinaturas
SELECT 
  id,
  email,
  display_name,
  is_admin,
  account_status,
  subscription_expiry_date,
  DATEDIFF(subscription_expiry_date, CURDATE()) as dias_restantes,
  is_active
FROM resellers
ORDER BY subscription_expiry_date ASC;
```

### Verificar Lembretes Pendentes:
```sql
-- Lembretes pendentes de hoje
SELECT 
  wrl.id,
  r.email as reseller,
  c.name as cliente,
  wt.name as template,
  wrl.status,
  wrl.created_at
FROM whatsapp_reminder_logs wrl
JOIN resellers r ON wrl.reseller_id = r.id
JOIN clients c ON wrl.client_id = c.id
JOIN whatsapp_templates wt ON wrl.template_id = wt.id
WHERE DATE(wrl.created_at) = CURDATE()
AND wrl.status = 'pending'
ORDER BY wrl.created_at DESC;
```

### Verificar Faturas Geradas Hoje:
```sql
-- Faturas geradas hoje
SELECT 
  i.id,
  r.email as reseller,
  c.name as cliente,
  i.value,
  i.due_date,
  i.status,
  i.created_at
FROM invoices i
JOIN resellers r ON i.reseller_id = r.id
JOIN clients c ON i.client_id = c.id
WHERE DATE(i.created_at) = CURDATE()
ORDER BY i.created_at DESC;
```

### Verificar Pagamentos de Assinatura:
```sql
-- Pagamentos de assinatura recentes
SELECT 
  rph.id,
  r.email as reseller,
  rph.amount,
  rph.status,
  rph.payment_method,
  rph.created_at,
  rph.expires_at
FROM reseller_payment_history rph
JOIN resellers r ON rph.reseller_id = r.id
ORDER BY rph.created_at DESC
LIMIT 20;
```

---

## 🔄 Forçar Processamento Manual

### Forçar Processamento de Lembretes:
```bash
# Editar reminder-processor.js e adicionar no final:
# processReminders().then(() => process.exit(0));
node scripts/reminder-processor.js
```

### Forçar Geração de Faturas:
```bash
# Editar invoice-processor.js e adicionar no final:
# processInvoices().then(() => process.exit(0));
node scripts/invoice-processor.js
```

### Forçar Verificação de Assinaturas:
```bash
# Editar subscription-processor.js e adicionar no final:
# runProcessor().then(() => process.exit(0));
node scripts/subscription-processor.js
```

---

## 🐛 Debug

### Modo Verbose (adicionar no .env):
```env
# Ativar logs detalhados
DEBUG=true
LOG_LEVEL=debug

# Reduzir intervalo de verificação (para testes)
CHECK_INTERVAL_MINUTES=1
```

### Testar Conexão WhatsApp:
```bash
# Verificar se instância está conectada
curl -X GET "http://localhost:3002/instance/connectionState/reseller_1" \
  -H "apikey: gestplay-api-key-2024"
```

### Testar Envio de Mensagem:
```bash
# Enviar mensagem de teste
curl -X POST "http://localhost:3002/message/sendText/reseller_1" \
  -H "Content-Type: application/json" \
  -H "apikey: gestplay-api-key-2024" \
  -d '{
    "number": "5511999999999",
    "text": "Teste de mensagem"
  }'
```

---

## 📦 Reinstalar Dependências

```bash
# Instalar/atualizar dependências
npm install

# Ou com yarn
yarn install

# Verificar versões
node --version
npm --version
```

---

## 🔐 Variáveis de Ambiente Importantes

```env
# Banco de Dados
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=
DB_NAME=iptv_manager

# WhatsApp
WHATSAPP_API_URL=http://localhost:3002
WHATSAPP_API_KEY=gestplay-api-key-2024

# Intervalos (em minutos)
CHECK_INTERVAL_MINUTES=1          # Reminder Processor
INVOICE_CHECK_INTERVAL=60         # Invoice Processor (1 hora)
CONNECTION_CHECK_INTERVAL=30      # Connection Monitor (30 segundos)

# Faturas
INVOICE_DAYS_BEFORE=10            # Gerar fatura X dias antes

# Portas dos Health Checks
REMINDER_STATUS_PORT=3003
INVOICE_STATUS_PORT=3004
SUBSCRIPTION_PROCESSOR_PORT=3005

# App
APP_URL=http://localhost:9002
```

---

## 🎯 Troubleshooting

### Problema: Lembretes não estão sendo enviados
```bash
# 1. Verificar se processor está rodando
curl http://localhost:3003/health

# 2. Verificar conexão WhatsApp
curl http://localhost:3002/instance/connectionState/reseller_1 \
  -H "apikey: gestplay-api-key-2024"

# 3. Verificar assinatura do reseller
node scripts/test-subscription-block.js

# 4. Ver logs
tail -f scripts/logs/reminder-processor.log
```

### Problema: Faturas não estão sendo geradas
```bash
# 1. Verificar se processor está rodando
curl http://localhost:3004/health

# 2. Verificar assinatura do reseller
node scripts/test-subscription-block.js

# 3. Verificar clientes próximos do vencimento
# (executar SQL acima)

# 4. Ver logs
tail -f scripts/logs/invoice-processor.log
```

### Problema: Assinatura não renova após pagamento
```bash
# 1. Verificar se webhook foi recebido
# Ver logs do servidor PHP

# 2. Verificar pagamento no banco
# (executar SQL acima)

# 3. Forçar aprovação manual (se necessário)
php force-reseller-subscription-approval.php
```

---

## 📚 Documentação Adicional

- `docs/SUBSCRIPTION_BLOCKING_SYSTEM.md` - Sistema de bloqueio completo
- `docs/WHATSAPP_REMINDER_IMPROVEMENTS.md` - Melhorias do WhatsApp
- `RESUMO_IMPLEMENTACAO_PROCESSORS.md` - Resumo da implementação
- `README.md` - Documentação geral do projeto

---

## 🆘 Suporte

Em caso de problemas:

1. Verificar logs dos processors
2. Executar script de teste
3. Verificar health checks
4. Consultar documentação
5. Verificar variáveis de ambiente

**Lembre-se**: Admins sempre têm acesso, mesmo com assinatura expirada!
