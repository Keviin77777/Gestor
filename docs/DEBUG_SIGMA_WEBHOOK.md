# 🔧 Debug: Renovação Sigma via Webhook

## 🎯 Problema

O webhook não está renovando no Sigma automaticamente, mas a baixa manual funciona.

## ✅ Correção Aplicada

Atualizei a função `renewClientInSigma()` para usar **exatamente o mesmo método** da baixa manual:

- ✅ Endpoint: `/api/webhook/customer/renew`
- ✅ Header: `Authorization: Bearer {sigma_token}`
- ✅ Body: `{"username": "...", "packageId": "..."}`
- ✅ Método: `file_get_contents()` (mesmo da baixa manual)

## 🧪 Como Testar

### 1. Teste Manual da Função

```bash
php test-sigma-webhook.php
```

**Antes de executar, edite o arquivo e configure:**
- `$fake_invoice['client_id']` → ID de um cliente real
- `$fake_reseller_id` → ID do seu reseller

### 2. Verificar Configuração

```sql
-- Verificar se reseller tem Sigma configurado
SELECT id, sigma_url, sigma_connected, sigma_token 
FROM resellers 
WHERE id = 1;

-- Verificar se cliente tem username
SELECT id, name, username, sigma_package_id 
FROM clients 
WHERE id = 1;
```

### 3. Testar Pagamento Real

1. Gere uma fatura
2. Pague via PIX
3. Monitore os logs:

```bash
tail -f /var/log/php_errors.log | grep -E "Webhook MP|Sigma"
```

## 📊 Logs Esperados

### Sucesso:
```
Webhook MP: Tentando renovar no Sigma para reseller_id=1, client_id=123
Renovando cliente no Sigma via webhook: username=cliente123
Sigma Webhook - URL: https://sigma.com/api/webhook/customer/renew
Sigma Webhook - POST data: {"username":"cliente123","packageId":"BV4D3rLaqZ"}
Sigma Webhook - HTTP Code: 200
Cliente cliente123 renovado no Sigma com sucesso via webhook
```

### Erro de Configuração:
```
Sigma não configurado ou não conectado para reseller 1
```

### Erro de Cliente:
```
Cliente 123 não tem username configurado
```

### Erro de API:
```
Sigma Webhook - HTTP Code: 401
Falha ao renovar no Sigma: HTTP 401
```

## 🔍 Checklist de Verificação

### Reseller (tabela `resellers`)
- [ ] `sigma_url` preenchido
- [ ] `sigma_token` preenchido
- [ ] `sigma_connected = 1`

### Cliente (tabela `clients`)
- [ ] `username` preenchido
- [ ] `sigma_package_id` preenchido (ou usa default)

### Webhook
- [ ] Fatura foi marcada como paga
- [ ] Logs mostram tentativa de renovação
- [ ] HTTP Code 200 na resposta do Sigma

## 🐛 Problemas Comuns

### 1. "Sigma não configurado"

**Causa:** `sigma_connected != 1` ou campos vazios

**Solução:**
```sql
UPDATE resellers SET 
  sigma_connected = 1,
  sigma_url = 'https://seu-sigma.com',
  sigma_token = 'seu-token-aqui'
WHERE id = 1;
```

### 2. "Cliente não tem username"

**Causa:** Campo `username` vazio na tabela `clients`

**Solução:**
```sql
UPDATE clients SET 
  username = 'cliente123'
WHERE id = 1;
```

### 3. "HTTP 401 Unauthorized"

**Causa:** Token do Sigma inválido ou expirado

**Solução:**
1. Vá em Sigma > Configurações
2. Reconecte o Sigma
3. Verifique se o token foi atualizado

### 4. "HTTP 404 Not Found"

**Causa:** URL do Sigma incorreta ou endpoint não existe

**Solução:**
1. Verifique se a URL está correta
2. Teste manualmente: `https://seu-sigma.com/api/webhook/customer/renew`

## 🔄 Comparação: Manual vs Automático

### Baixa Manual (funciona)
```php
// api/resources/invoices-payment.php
$url = rtrim($invoice['sigma_url'], '/') . '/api/webhook/customer/renew';
$sigma_data = [
    'username' => $invoice['client_username'],
    'packageId' => $package_id
];
// ... file_get_contents com Authorization Bearer
```

### Webhook Automático (corrigido)
```php
// api/webhooks/mercadopago.php
$url = rtrim($sigma_config['sigma_url'], '/') . '/api/webhook/customer/renew';
$sigma_data = [
    'username' => $client['username'],
    'packageId' => $package_id
];
// ... file_get_contents com Authorization Bearer
```

**Agora são idênticos!** ✅

## 📝 Próximos Passos

1. **Execute o teste:** `php test-sigma-webhook.php`
2. **Verifique os logs** durante um pagamento real
3. **Confirme no Sigma** se o cliente foi renovado
4. **Reporte o resultado** para ajustes finais

---

**A função agora usa exatamente o mesmo código da baixa manual!** 🎯
