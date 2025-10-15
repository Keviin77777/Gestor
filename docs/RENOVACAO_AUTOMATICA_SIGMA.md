# ✅ Renovação Automática no Sigma via Webhook

## 🎯 Implementação Concluída

Agora quando um cliente efetuar o pagamento via PIX (ou qualquer método de pagamento), o sistema automaticamente:

1. ✅ Marca a fatura como paga
2. ✅ Renova o cliente no gestor (+30 dias)
3. ✅ **Renova o cliente no Sigma** (se configurado)
4. ✅ **Envia mensagem de confirmação via WhatsApp** (template payment_confirmed)

## 📝 O que foi alterado

### 1. Webhook Mercado Pago (`api/webhooks/mercadopago.php`)
- Adicionada função `renewClientInSigma()`
- **Usa o mesmo método da baixa manual** (endpoint `/api/webhook/customer/renew`)
- Autenticação via `Authorization: Bearer {token}`
- Chamada automática após renovação no gestor
- Logs detalhados para debug

### 2. Webhook Asaas (`api/webhooks/asaas.php`)
- Adicionada renovação no Sigma
- Adicionado envio de WhatsApp
- Reutiliza funções do Mercado Pago

### 3. Método de Integração
**Antes:** Tentava usar API antiga do Sigma (não funcionava)
**Agora:** Usa **exatamente o mesmo webhook** da baixa manual ✅

```php
// Endpoint: /api/webhook/customer/renew
// Header: Authorization: Bearer {token}
// Body: {"username": "cliente123", "packageId": "BV4D3rLaqZ"}
```

## 🔄 Fluxo Completo

### Pagamento Manual (já funcionava)
1. Admin clica em "Dar Baixa" na fatura
2. Sistema renova no gestor
3. Sistema renova no Sigma
4. Sistema envia WhatsApp

### Pagamento Automático (NOVO! ✨)
1. Cliente paga via PIX
2. Webhook recebe notificação
3. Sistema marca fatura como paga
4. Sistema renova no gestor (+30 dias)
5. **Sistema renova no Sigma** (+30 dias) ✅
6. **Sistema envia WhatsApp** (template payment_confirmed) ✅

## 🧪 Como Testar

### 1. Configurar Painel
Certifique-se que o painel tem:
- `sigma_url` configurado (ex: https://seu-sigma.com)
- `sigma_token` configurado (Bearer token)
- `sigma_username` configurado (usuário admin do Sigma)
- `sigma_connected = 1`

### 2. Configurar Cliente
O cliente precisa ter:
- `username` preenchido (username do cliente no Sigma)
- `panel_id` preenchido (ID do painel com Sigma configurado)

### 3. Criar Template WhatsApp
Crie um template com:
- **Tipo:** payment_confirmed
- **Trigger:** invoice_paid
- **Ativo:** ✅ Sim

Exemplo de mensagem:
```
🎉 *Pagamento Confirmado!*

Olá {{cliente_nome}}! 

Seu pagamento foi aprovado com sucesso! ✅

💰 Valor: R$ {{valor}}
📅 Nova data de vencimento: {{data_vencimento}}

Seu acesso foi renovado automaticamente! 🚀

Obrigado pela preferência!

_{{empresa_nome}}_
```

### 4. Testar Pagamento
1. Gere uma fatura para um cliente
2. Faça o pagamento via PIX
3. Aguarde o webhook ser processado
4. Verifique os logs

## 📊 Logs para Monitorar

Os logs vão mostrar:

```
Renovando cliente no Sigma via webhook: username=cliente123
Sigma Webhook - URL: https://sigma.com/api/webhook/customer/renew
Sigma Webhook - POST data: {"username":"cliente123","packageId":"BV4D3rLaqZ"}
Sigma Webhook - HTTP Code: 200
Cliente cliente123 renovado no Sigma com sucesso via webhook
```

Se houver erro:
```
Sigma não configurado ou não conectado para reseller 1
Cliente 123 não tem username configurado
Falha ao renovar no Sigma: HTTP 401
```

## 🔍 Verificar se Funcionou

### No Gestor
- Fatura marcada como "Paga"
- Cliente com status "Ativo"
- Data de renovação atualizada (+30 dias)

### No Sigma
- Usuário com data de expiração atualizada
- Usuário habilitado (enabled = 1)

### WhatsApp
- Cliente recebe mensagem de confirmação
- Mensagem usa o template configurado

## ⚙️ Configuração Necessária

### Painel (tabela `panels`)
A configuração do Sigma fica no **painel**, não no reseller:
```sql
UPDATE panels SET
  sigma_url = 'https://seu-sigma.com',
  sigma_token = 'seu-bearer-token-aqui',
  sigma_username = 'admin',  -- Usuário admin do Sigma
  sigma_connected = 1
WHERE id = 'seu-panel-id';
```

### Cliente (tabela `clients`)
O cliente precisa ter username e estar associado ao painel:
```sql
UPDATE clients SET
  username = 'cliente123',
  panel_id = 'seu-panel-id'  -- ID do painel com Sigma configurado
WHERE id = 'seu-client-id';
```

### Plano (tabela `plans`) - Opcional
Pode definir um package_id específico por plano:
```sql
UPDATE plans SET
  sigma_package_id = 'BV4D3rLaqZ'  -- ID do pacote no Sigma
WHERE id = 'seu-plan-id';
```

## 🐛 Troubleshooting

### Problema: Não renova no Sigma

**Verificar:**
1. Painel tem `sigma_url`, `sigma_token`, `sigma_username` e `sigma_connected = 1`?
2. Cliente tem `username` configurado?
3. Cliente está associado ao painel correto (`panel_id`)?
4. Token do Sigma está válido?
5. Sigma está acessível?
6. Endpoint `/api/webhook/customer/renew` existe no Sigma?

**Logs:**
```bash
tail -f /var/log/php_errors.log | grep "Webhook Sigma"
```

**Teste manual:**
```bash
php test-sigma-webhook.php
```

**Resultado esperado:**
```
Webhook Sigma: HTTP Code: 200
Webhook Sigma: Cliente cliente123 renovado com sucesso!
```

### Problema: Não envia WhatsApp

**Verificar:**
1. Existe template com `trigger_event = 'invoice_paid'`?
2. Template está ativo (`is_active = 1`)?
3. Cliente tem telefone cadastrado?
4. WhatsApp está conectado?

**Logs:**
```bash
tail -f /var/log/php_errors.log | grep WhatsApp
```

## ✅ Checklist de Implementação

- [x] Função `renewClientInSigma()` criada
- [x] Integrada no webhook Mercado Pago
- [x] Integrada no webhook Asaas
- [x] Envio de WhatsApp automático
- [x] Logs detalhados
- [x] Tratamento de erros
- [x] Documentação completa

## 🎉 Resultado

Agora o sistema está 100% automatizado:
- ✅ Cliente paga
- ✅ Sistema renova automaticamente
- ✅ Sigma é atualizado
- ✅ Cliente recebe confirmação

**Sem intervenção manual necessária!** 🚀
