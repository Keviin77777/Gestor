# Sistema de WhatsApp Automático para Revendedores

## Visão Geral

Sistema completo para envio automático de mensagens WhatsApp aos revendedores quando suas assinaturas estiverem próximas do vencimento ou vencidas.

## Componentes

### 1. Templates de Mensagens

Localizados na tabela `reseller_whatsapp_templates`:

- **expiring_7days** - ⚠️ Assinatura vence em 7 dias
- **expiring_3days** - 🚨 Assinatura vence em 3 dias  
- **expiring_1day** - 🔴 Assinatura vence AMANHÃ
- **expired** - ❌ Assinatura VENCIDA
- **payment_confirmed** - ✅ Pagamento Confirmado
- **welcome** - 🎉 Boas-vindas Revenda

### 2. Processador Automático

**Arquivo:** `scripts/reseller-whatsapp-processor.js`

**Funcionalidades:**
- Verifica revendedores com assinatura expirando
- Envia mensagens WhatsApp automaticamente
- Registra logs de envio
- Evita envios duplicados no mesmo dia
- Executa a cada 1 hora

**Porta:** 3006 (Health check: http://localhost:3006/health)

### 3. Logs de Envio

Tabela `reseller_whatsapp_logs` registra:
- ID do revendedor
- Telefone
- Mensagem enviada
- Tipo de gatilho
- Status (sent/failed/pending)
- Data/hora de envio
- Mensagem de erro (se houver)

## Variáveis Disponíveis nos Templates

- `{{revenda_nome}}` - Nome do revendedor
- `{{revenda_email}}` - Email do revendedor
- `{{plano_nome}}` - Nome do plano de assinatura
- `{{valor}}` - Valor da assinatura
- `{{data_vencimento}}` - Data de vencimento
- `{{link_renovacao}}` - Link para renovar assinatura

## Configuração

### Pré-requisitos

1. **WhatsApp do Admin Conectado**
   - Acesse `/dashboard/whatsapp` como ADMIN
   - Conecte o WhatsApp usando QR Code
   - A instância será `admin_whatsapp`

2. **Revendedores com Telefone**
   - Cadastre o telefone dos revendedores
   - Formato: (11) 98765-4321 ou 11987654321
   - O sistema adiciona automaticamente o código do país (55)

3. **Templates Ativos**
   - Verifique em `/dashboard/whatsapp/templates`
   - Filtre por "Para Revendedores (ADMIN)"
   - Certifique-se que os templates estão ativos

### Iniciar o Processador

#### Opção 1: Com todos os processadores
```bash
cd scripts
start-all-processors.bat
```

#### Opção 2: Apenas o processador de revendedores
```bash
cd scripts
node reseller-whatsapp-processor.js
```

## Fluxo de Funcionamento

### 1. Verificação Automática (A cada 1 hora)

```
┌─────────────────────────────────────────┐
│  Processador verifica banco de dados   │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  Busca revendedores com:                │
│  - Assinatura vencendo em 7, 3, 1 dias │
│  - Assinatura vencida                   │
│  - Telefone cadastrado                  │
│  - Sem envio hoje                       │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  Para cada revendedor:                  │
│  1. Busca template correspondente       │
│  2. Substitui variáveis                 │
│  3. Envia WhatsApp                      │
│  4. Registra log                        │
└─────────────────────────────────────────┘
```

### 2. Exemplo de Envio

**Revendedor:**
- Nome: João Silva
- Email: joao@exemplo.com
- Telefone: (11) 98765-4321
- Plano: Premium (R$ 99,90)
- Vencimento: 15/10/2025
- Dias restantes: 7

**Template usado:** expiring_7days

**Mensagem enviada:**
```
⚠️ *Atenção João Silva!*

Sua assinatura do *Premium* vence em *7 dias*!

📅 Vencimento: 15/10/2025
💰 Valor para renovar: R$ 99.90

🔄 Renove agora e mantenha seu acesso:
http://localhost:9002/dashboard/subscription

Não perca o acesso ao seu painel de gestão!
```

## Monitoramento

### Verificar Status do Processador

```bash
curl http://localhost:3006/health
```

Resposta esperada:
```json
{
  "status": "ok",
  "service": "reseller-whatsapp-processor",
  "timestamp": "2025-10-14T10:30:00.000Z"
}
```

### Verificar Logs de Envio

```sql
-- Últimos 10 envios
SELECT 
  rwl.id,
  r.display_name,
  rwl.phone,
  rwl.trigger_type,
  rwl.status,
  rwl.sent_at
FROM reseller_whatsapp_logs rwl
JOIN resellers r ON rwl.reseller_id = r.id
ORDER BY rwl.sent_at DESC
LIMIT 10;

-- Estatísticas de envio
SELECT 
  trigger_type,
  status,
  COUNT(*) as total,
  DATE(sent_at) as data
FROM reseller_whatsapp_logs
WHERE DATE(sent_at) = CURDATE()
GROUP BY trigger_type, status, DATE(sent_at);
```

### Verificar Revendedores Pendentes

```sql
-- Revendedores que receberão mensagem hoje
SELECT 
  r.id,
  r.display_name,
  r.email,
  r.phone,
  r.subscription_expiry_date,
  DATEDIFF(r.subscription_expiry_date, CURDATE()) as days_remaining,
  CASE 
    WHEN DATEDIFF(r.subscription_expiry_date, CURDATE()) = 7 THEN 'expiring_7days'
    WHEN DATEDIFF(r.subscription_expiry_date, CURDATE()) = 3 THEN 'expiring_3days'
    WHEN DATEDIFF(r.subscription_expiry_date, CURDATE()) = 1 THEN 'expiring_1day'
    WHEN r.subscription_expiry_date < CURDATE() THEN 'expired'
  END as trigger_type
FROM resellers r
WHERE r.is_active = TRUE
  AND r.phone IS NOT NULL
  AND r.phone != ''
  AND (
    DATEDIFF(r.subscription_expiry_date, CURDATE()) IN (7, 3, 1)
    OR r.subscription_expiry_date < CURDATE()
  )
  AND NOT EXISTS (
    SELECT 1 FROM reseller_whatsapp_logs rwl
    WHERE rwl.reseller_id = r.id
      AND DATE(rwl.sent_at) = CURDATE()
  );
```

## Personalização de Templates

### Via Interface (Recomendado)

1. Acesse `/dashboard/whatsapp/templates` como ADMIN
2. Filtre por "Para Revendedores (ADMIN)"
3. Clique em "Editar" no template desejado
4. Modifique a mensagem
5. Salve as alterações

### Via SQL

```sql
UPDATE reseller_whatsapp_templates
SET message = 'Sua nova mensagem aqui com {{variáveis}}'
WHERE trigger_type = 'expiring_7days';
```

## Troubleshooting

### Mensagens não estão sendo enviadas

1. **Verificar WhatsApp do Admin conectado:**
   ```bash
   curl http://localhost:3002/instance/connectionState/admin_whatsapp
   ```

2. **Verificar processador rodando:**
   ```bash
   curl http://localhost:3006/health
   ```

3. **Verificar templates ativos:**
   ```sql
   SELECT * FROM reseller_whatsapp_templates WHERE is_active = TRUE;
   ```

4. **Verificar revendedores com telefone:**
   ```sql
   SELECT COUNT(*) FROM resellers WHERE phone IS NOT NULL AND phone != '';
   ```

### Mensagens duplicadas

O sistema evita duplicatas verificando se já foi enviada mensagem hoje.
Se precisar reenviar, delete o log:

```sql
DELETE FROM reseller_whatsapp_logs
WHERE reseller_id = 'ID_DO_REVENDEDOR'
  AND DATE(sent_at) = CURDATE();
```

### Erro ao enviar WhatsApp

Verifique os logs do processador:
```bash
# No terminal onde o processador está rodando
# Procure por mensagens de erro
```

Causas comuns:
- WhatsApp do admin desconectado
- Número de telefone inválido
- API do WhatsApp fora do ar

## Configurações Avançadas

### Alterar Intervalo de Execução

Edite `scripts/reseller-whatsapp-processor.js`:

```javascript
// Padrão: 1 hora
const INTERVAL = 60 * 60 * 1000;

// Alterar para 30 minutos:
const INTERVAL = 30 * 60 * 1000;

// Alterar para 2 horas:
const INTERVAL = 2 * 60 * 60 * 1000;
```

### Alterar Porta do Health Check

No arquivo `.env`:
```
RESELLER_WHATSAPP_PROCESSOR_PORT=3006
```

### Configurar Instância do WhatsApp

No arquivo `.env`:
```
WHATSAPP_API_URL=http://localhost:3002
WHATSAPP_API_KEY=UltraGestor-api-key-2024
```

## Segurança

- ✅ Apenas ADMIN pode ver templates de revendedores
- ✅ Logs registram todas as tentativas de envio
- ✅ Evita envios duplicados no mesmo dia
- ✅ Valida números de telefone antes de enviar
- ✅ Timeout de 30 segundos por envio
- ✅ Aguarda 2 segundos entre envios

## Estatísticas

### Dashboard de Envios (Futuro)

Planejado para próximas versões:
- Total de mensagens enviadas por tipo
- Taxa de sucesso/falha
- Revendedores mais notificados
- Gráfico de envios por dia/semana/mês

## Manutenção

### Limpeza de Logs Antigos

```sql
-- Deletar logs com mais de 90 dias
DELETE FROM reseller_whatsapp_logs
WHERE sent_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
```

### Backup de Templates

```sql
-- Exportar templates
SELECT * FROM reseller_whatsapp_templates
INTO OUTFILE '/tmp/reseller_templates_backup.csv'
FIELDS TERMINATED BY ',' 
ENCLOSED BY '"'
LINES TERMINATED BY '\n';
```

## Suporte

Para problemas ou dúvidas:
1. Verifique os logs do processador
2. Consulte a documentação do WhatsApp Server
3. Verifique a conexão com o banco de dados
4. Teste manualmente o envio de WhatsApp

## Changelog

### v1.0.0 (14/10/2025)
- ✅ Sistema inicial implementado
- ✅ 6 templates padrão criados
- ✅ Processador automático funcionando
- ✅ Logs de envio implementados
- ✅ Integração com WhatsApp Server
- ✅ Health check endpoint
- ✅ Documentação completa
