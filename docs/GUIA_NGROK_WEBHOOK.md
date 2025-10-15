# 🚀 Guia: Configurar Webhooks com ngrok

## 📋 Pré-requisitos

- Servidor PHP rodando na porta 8080
- Conta no Mercado Pago (modo sandbox ou produção)

## 🔧 Passo 1: Instalar ngrok

### Windows:

1. **Download:**
   - Acesse: https://ngrok.com/download
   - Baixe `ngrok-v3-stable-windows-amd64.zip`
   - Extraia para `C:\ngrok\`

2. **Adicionar ao PATH (opcional):**
   - Painel de Controle → Sistema → Configurações avançadas
   - Variáveis de Ambiente → PATH
   - Adicionar: `C:\ngrok`

## 🔑 Passo 2: Configurar ngrok

1. **Criar conta:**
   - https://dashboard.ngrok.com/signup
   - Copie seu **Authtoken**

2. **Configurar token:**
   ```powershell
   ngrok config add-authtoken SEU_TOKEN_AQUI
   ```

## 🌐 Passo 3: Iniciar túnel

```powershell
# Expor porta 8080
ngrok http 8080
```

**Você verá:**
```
Forwarding  https://abc123.ngrok-free.app -> http://localhost:8080
```

⚠️ **IMPORTANTE:** Deixe esta janela aberta!

## ⚙️ Passo 4: Atualizar .env

Copie a URL do ngrok e atualize o `.env`:

```env
APP_URL=https://abc123.ngrok-free.app
```

**Reinicie os servidores:**
```powershell
# Parar e reiniciar PHP
# Parar e reiniciar Next.js
```

## 🧪 Passo 5: Testar webhook

### Opção A - Script PowerShell:
```powershell
.\test-webhook.ps1
```

### Opção B - cURL:
```bash
curl -X POST https://abc123.ngrok-free.app/api/webhooks/mercadopago \
  -H "Content-Type: application/json" \
  -d '{"type":"payment","data":{"id":"123456"}}'
```

### Opção C - Postman/Insomnia:
- URL: `https://abc123.ngrok-free.app/api/webhooks/mercadopago`
- Method: POST
- Body (JSON):
  ```json
  {
    "type": "payment",
    "data": {
      "id": "123456789"
    }
  }
  ```

## 🔍 Passo 6: Verificar logs

### No banco de dados:
```sql
SELECT * FROM payment_webhooks ORDER BY created_at DESC LIMIT 5;
```

### No ngrok (Web Interface):
- Abra: http://127.0.0.1:4040
- Veja todas as requisições recebidas

## 🎯 Passo 7: Configurar no Mercado Pago

1. **Acesse:** https://www.mercadopago.com.br/developers/panel
2. **Vá em:** Webhooks / Notificações
3. **Adicione:**
   ```
   https://abc123.ngrok-free.app/api/webhooks/mercadopago
   ```
4. **Eventos:** ✅ Pagamentos (payments)
5. **Salve**

## 🧪 Passo 8: Testar pagamento real

1. Gere uma fatura no sistema
2. Faça um pagamento PIX (sandbox ou real)
3. Aguarde o webhook (pode levar até 30 segundos)
4. Verifique:
   - ✅ Fatura marcada como paga
   - ✅ Cliente renovado (+30 dias)
   - ✅ WhatsApp enviado

## 📊 Monitoramento

### Logs do PHP:
```powershell
# Ver últimas linhas do log
Get-Content -Path "C:\xampp\apache\logs\error.log" -Tail 50
```

### Logs do ngrok:
- Interface web: http://127.0.0.1:4040
- Ver todas as requisições HTTP

### Banco de dados:
```sql
-- Webhooks recebidos
SELECT * FROM payment_webhooks ORDER BY created_at DESC;

-- Transações
SELECT * FROM payment_transactions ORDER BY created_at DESC;

-- WhatsApp enviados
SELECT * FROM whatsapp_invoice_logs ORDER BY sent_at DESC;
```

## ⚠️ Limitações do ngrok (plano gratuito)

- ✅ 1 túnel simultâneo
- ✅ URL muda a cada reinício
- ✅ 40 conexões/minuto
- ❌ Não é permanente (use apenas para testes)

## 🚀 Produção

Para produção, use um domínio real:
```env
APP_URL=https://seudominio.com
```

E configure o webhook diretamente no Mercado Pago:
```
https://seudominio.com/api/webhooks/mercadopago
```

## 🆘 Troubleshooting

### Erro: "ngrok not found"
- Instale o ngrok ou use caminho completo: `C:\ngrok\ngrok.exe`

### Erro: "Invalid authtoken"
- Configure o token: `ngrok config add-authtoken SEU_TOKEN`

### Webhook não recebe notificações:
1. Verifique se ngrok está rodando
2. Verifique se APP_URL está correto no .env
3. Teste manualmente com curl/Postman
4. Veja logs no ngrok: http://127.0.0.1:4040

### Pagamento não renova cliente:
1. Verifique logs do PHP
2. Verifique tabela `payment_webhooks`
3. Verifique se o `external_id` está correto
4. Verifique se o template "Renovação confirmada" existe

## 📚 Recursos

- ngrok: https://ngrok.com/docs
- Mercado Pago Webhooks: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
- Documentação do sistema: `docs/`
