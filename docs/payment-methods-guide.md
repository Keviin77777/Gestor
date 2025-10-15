# 💳 Guia Completo - Sistema de Métodos de Pagamento

## 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Instalação](#instalação)
3. [Configuração dos Métodos](#configuração-dos-métodos)
4. [Como Funciona](#como-funciona)
5. [Templates WhatsApp](#templates-whatsapp)
6. [Webhooks](#webhooks)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

O sistema de métodos de pagamento permite que seus clientes paguem faturas através de:

- **💳 Mercado Pago** - Pagamento via PIX com QR Code automático
- **🏦 Asaas** - Gateway de pagamento completo com PIX
- **📱 PIX Manual** - Chave PIX própria com checkout personalizado

### Fluxo Completo

```
1. Fatura é gerada automaticamente (10 dias antes do vencimento)
2. WhatsApp é enviado com link da fatura
3. Cliente clica no link
4. Sistema abre checkout conforme método configurado
5. Cliente paga
6. Webhook confirma pagamento automaticamente
7. Fatura marcada como paga
8. Cliente renovado automaticamente
9. WhatsApp de confirmação enviado
```

---

## 🚀 Instalação

### 1. Executar Migration do Banco de Dados

```bash
mysql -u root -p iptv_manager < database/migrations/004_payment_methods.sql
```

Isso criará as tabelas:
- `payment_methods` - Configurações dos métodos
- `payment_transactions` - Histórico de transações
- `payment_webhooks` - Log de webhooks recebidos

### 2. Configurar Variáveis de Ambiente

Adicione no arquivo `.env`:

```env
# URL pública do seu sistema (para webhooks)
APP_URL=https://seudominio.com

# WhatsApp (já configurado)
WHATSAPP_API_URL=http://localhost:3002
WHATSAPP_API_KEY=sua-chave-api
```

### 3. Instalar Dependência QRCode (Frontend)

```bash
npm install qrcode
npm install --save-dev @types/qrcode
```

---

## ⚙️ Configuração dos Métodos

### 💳 Mercado Pago

#### Passo 1: Obter Credenciais

1. Acesse: https://www.mercadopago.com.br/developers
2. Faça login na sua conta Mercado Pago
3. Vá em **"Suas integrações"** → **"Credenciais"**
4. Copie:
   - **Public Key** (começa com `APP_USR-`)
   - **Access Token** (começa com `APP_USR-`)

⚠️ **IMPORTANTE**: Use as credenciais de **PRODUÇÃO**, não de teste!

#### Passo 2: Configurar no Sistema

1. Acesse **Dashboard** → **Pagamentos** → **Métodos**
2. Clique em **"Adicionar Método"**
3. Selecione aba **"Mercado Pago"**
4. Cole as credenciais:
   - Public Key
   - Access Token
5. Ative o método
6. Marque como padrão (se desejar)
7. Clique em **"Criar"**

#### Passo 3: Configurar Webhook no Mercado Pago

1. No painel do Mercado Pago, vá em **"Webhooks"**
2. Adicione a URL: `https://seudominio.com/api/webhooks/mercadopago`
3. Selecione eventos: **"Pagamentos"**
4. Salve

---

### 🏦 Asaas

#### Passo 1: Obter Credenciais

1. Acesse: https://www.asaas.com
2. Faça login na sua conta
3. Vá em **"Integrações"** → **"API Key"**
4. Copie a **API Key** (começa com `$aact_`)
5. Anote sua **Chave PIX** cadastrada no Asaas

#### Passo 2: Configurar no Sistema

1. Acesse **Dashboard** → **Pagamentos** → **Métodos**
2. Clique em **"Adicionar Método"**
3. Selecione aba **"Asaas"**
4. Cole as credenciais:
   - API Key
   - Chave PIX
5. **COPIE** a URL do Webhook mostrada
6. Ative o método
7. Marque como padrão (se desejar)
8. Clique em **"Criar"**

#### Passo 3: Configurar Webhook no Asaas

1. No painel do Asaas, vá em **"Integrações"** → **"Webhooks"**
2. Clique em **"Novo Webhook"**
3. Cole a URL: `https://seudominio.com/api/webhooks/asaas`
4. Selecione eventos:
   - `PAYMENT_RECEIVED`
   - `PAYMENT_CONFIRMED`
   - `PAYMENT_OVERDUE`
5. Salve

---

### 📱 PIX Manual

#### Passo 1: Configurar no Sistema

1. Acesse **Dashboard** → **Pagamentos** → **Métodos**
2. Clique em **"Adicionar Método"**
3. Selecione aba **"PIX Manual"**
4. Preencha:
   - **Tipo de Chave**: CPF, CNPJ, E-mail, Telefone ou Aleatória
   - **Chave PIX**: Sua chave PIX
   - **Nome do Titular**: Nome completo do titular da conta
5. Ative o método
6. Marque como padrão (se desejar)
7. Clique em **"Criar"**

#### Como Funciona

- Cliente recebe link da fatura
- Abre página de checkout com:
  - QR Code PIX gerado automaticamente
  - Código PIX copia e cola
  - Dados do beneficiário
- Cliente paga manualmente
- **Você precisa confirmar o pagamento manualmente** no sistema

---

## 🔄 Como Funciona

### Geração Automática de Faturas

O sistema gera faturas automaticamente **10 dias antes** do vencimento do cliente.

**Arquivo**: `scripts/invoice-processor.js`

```javascript
// Roda a cada 1 hora
// Verifica clientes com vencimento em até 10 dias
// Gera fatura se não existir
// Gera link de pagamento automaticamente
// Envia WhatsApp com link
```

### Geração de Link de Pagamento

Quando uma fatura é criada, o sistema:

1. Busca o método de pagamento padrão do revendedor
2. Gera link conforme o método:
   - **Mercado Pago**: Cria pagamento PIX via API
   - **Asaas**: Cria cobrança via API
   - **PIX Manual**: Gera link interno com QR Code
3. Salva link na fatura
4. Envia WhatsApp com link

### Confirmação de Pagamento

#### Mercado Pago / Asaas (Automático)

1. Cliente paga
2. Gateway envia webhook
3. Sistema processa webhook
4. Marca fatura como paga
5. Renova cliente automaticamente
6. Envia WhatsApp de confirmação

#### PIX Manual (Manual)

1. Cliente paga
2. Você confirma pagamento no sistema
3. Sistema marca fatura como paga
4. Renova cliente automaticamente
5. Envia WhatsApp de confirmação

---

## 📱 Templates WhatsApp

### Template: Fatura Disponível

**Trigger**: `invoice_generated`

**Variáveis Disponíveis**:
- `{{cliente_nome}}` - Nome do cliente
- `{{valor}}` - Valor da fatura
- `{{data_vencimento}}` - Data de vencimento
- `{{link_fatura}}` - **NOVO** - Link para pagamento
- `{{plano}}` - Nome do plano

**Exemplo de Mensagem**:

```
Olá {{cliente_nome}}! 👋

Sua fatura está disponível:

💰 Valor: R$ {{valor}}
📅 Vencimento: {{data_vencimento}}
📦 Plano: {{plano}}

🔗 Pagar agora:
{{link_fatura}}

Pagamento via PIX instantâneo! ⚡
```

### Template: Renovação Confirmada

**Trigger**: `invoice_paid`

**Exemplo de Mensagem**:

```
✅ Pagamento confirmado!

Olá {{cliente_nome}}, seu pagamento foi aprovado!

📅 Próximo vencimento: {{data_vencimento}}

Obrigado pela confiança! 🎉
```

### Como Atualizar Templates

1. Acesse **Dashboard** → **WhatsApp** → **Templates**
2. Encontre o template **"Fatura Disponível"**
3. Clique em **"Editar"**
4. Adicione a variável `{{link_fatura}}` na mensagem
5. Salve

---

## 🔗 Webhooks

### Mercado Pago

**URL**: `https://seudominio.com/api/webhooks/mercadopago`

**Eventos Processados**:
- `payment` - Notificação de pagamento

**Status Mapeados**:
- `approved` → Fatura paga
- `rejected` → Pagamento rejeitado
- `cancelled` → Pagamento cancelado
- `refunded` → Pagamento reembolsado

### Asaas

**URL**: `https://seudominio.com/api/webhooks/asaas`

**Eventos Processados**:
- `PAYMENT_RECEIVED` → Fatura paga
- `PAYMENT_CONFIRMED` → Fatura paga
- `PAYMENT_OVERDUE` → Pagamento atrasado
- `PAYMENT_DELETED` → Pagamento cancelado

### Testando Webhooks

#### Mercado Pago

```bash
curl -X POST https://seudominio.com/api/webhooks/mercadopago \
  -H "Content-Type: application/json" \
  -d '{
    "type": "payment",
    "data": {
      "id": "123456789"
    }
  }'
```

#### Asaas

```bash
curl -X POST https://seudominio.com/api/webhooks/asaas \
  -H "Content-Type: application/json" \
  -d '{
    "event": "PAYMENT_RECEIVED",
    "payment": {
      "id": "pay_123456789",
      "value": 50.00
    }
  }'
```

---

## 🐛 Troubleshooting

### Problema: Link de pagamento não é gerado

**Verificar**:

1. Método de pagamento está ativo?
```sql
SELECT * FROM payment_methods WHERE is_active = TRUE;
```

2. Credenciais estão corretas?
```sql
SELECT id, method_type, 
  CASE WHEN mp_access_token IS NOT NULL THEN 'OK' ELSE 'MISSING' END as mp_token,
  CASE WHEN asaas_api_key IS NOT NULL THEN 'OK' ELSE 'MISSING' END as asaas_key
FROM payment_methods;
```

3. Ver logs do processador:
```bash
pm2 logs faturas
```

### Problema: Webhook não está funcionando

**Verificar**:

1. URL está acessível publicamente?
```bash
curl https://seudominio.com/api/webhooks/mercadopago
```

2. Ver webhooks recebidos:
```sql
SELECT * FROM payment_webhooks 
ORDER BY created_at DESC 
LIMIT 10;
```

3. Ver erros:
```sql
SELECT * FROM payment_webhooks 
WHERE processed = FALSE OR error_message IS NOT NULL
ORDER BY created_at DESC;
```

### Problema: Pagamento confirmado mas fatura não atualiza

**Verificar**:

1. Transação existe?
```sql
SELECT * FROM payment_transactions 
WHERE invoice_id = 'ID_DA_FATURA';
```

2. Status da transação:
```sql
SELECT pt.*, i.status as invoice_status
FROM payment_transactions pt
JOIN invoices i ON pt.invoice_id = i.id
WHERE pt.external_id = 'ID_EXTERNO_DO_GATEWAY';
```

3. Processar webhook manualmente:
```bash
# Ver payload do webhook
SELECT payload FROM payment_webhooks WHERE id = 'WEBHOOK_ID';

# Reprocessar
UPDATE payment_webhooks SET processed = FALSE WHERE id = 'WEBHOOK_ID';
```

### Problema: QR Code não aparece no checkout PIX

**Verificar**:

1. Biblioteca qrcode instalada?
```bash
npm list qrcode
```

2. Chave PIX está configurada?
```sql
SELECT pix_key, pix_key_type FROM payment_methods 
WHERE method_type = 'pix_manual';
```

---

## 📊 Monitoramento

### Verificar Transações

```sql
-- Transações de hoje
SELECT 
  pt.id,
  pt.method_type,
  pt.status,
  pt.amount,
  i.invoice_number,
  c.name as client_name
FROM payment_transactions pt
JOIN invoices i ON pt.invoice_id = i.id
JOIN clients c ON i.client_id = c.id
WHERE DATE(pt.created_at) = CURDATE()
ORDER BY pt.created_at DESC;
```

### Verificar Webhooks

```sql
-- Webhooks não processados
SELECT * FROM payment_webhooks 
WHERE processed = FALSE
ORDER BY created_at DESC;

-- Webhooks com erro
SELECT * FROM payment_webhooks 
WHERE error_message IS NOT NULL
ORDER BY created_at DESC;
```

### Verificar Métodos Ativos

```sql
SELECT 
  method_type,
  is_active,
  is_default,
  COUNT(*) as total
FROM payment_methods
GROUP BY method_type, is_active, is_default;
```

---

## 🎯 Próximos Passos

1. ✅ Executar migration do banco
2. ✅ Configurar pelo menos um método de pagamento
3. ✅ Atualizar template WhatsApp com `{{link_fatura}}`
4. ✅ Configurar webhooks nos gateways
5. ✅ Testar com uma fatura de teste
6. ✅ Monitorar logs e webhooks

---

## 📞 Suporte

Em caso de dúvidas:
1. Verifique os logs: `pm2 logs`
2. Consulte a tabela `payment_webhooks` para erros
3. Teste as APIs dos gateways diretamente

---

**Desenvolvido com ❤️ para GestPlay**
