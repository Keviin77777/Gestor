# 🚀 Instalação Rápida - Métodos de Pagamento

## ⚡ Instalação em 5 Minutos

### 1️⃣ Executar Migrations do Banco

```bash
# Entrar no MySQL
mysql -u root -p iptv_manager

# Executar migrations
source database/migrations/004_payment_methods.sql
source database/migrations/005_update_whatsapp_templates_payment_link.sql

# Verificar tabelas criadas
SHOW TABLES LIKE 'payment%';
```

Você deve ver:
- ✅ `payment_methods`
- ✅ `payment_transactions`
- ✅ `payment_webhooks`

### 2️⃣ Instalar Dependência QRCode

```bash
npm install qrcode
npm install --save-dev @types/qrcode
```

### 3️⃣ Configurar Variável de Ambiente

Adicione no arquivo `.env`:

```env
APP_URL=https://seudominio.com
```

### 4️⃣ Reiniciar Serviços

```bash
# Se estiver usando PM2
pm2 restart all

# Ou reiniciar manualmente
npm run dev
```

---

## 🎯 Configuração Rápida

### Opção 1: PIX Manual (Mais Simples)

1. Acesse: **Dashboard** → **Pagamentos** → **Métodos**
2. Clique em **"Adicionar Método"**
3. Selecione aba **"PIX Manual"**
4. Preencha:
   - Tipo de Chave: `CPF` (ou outro)
   - Chave PIX: `sua@chave.pix`
   - Nome do Titular: `Seu Nome Completo`
5. Ative e marque como padrão
6. Salvar

✅ **Pronto!** Seus clientes já podem receber links de pagamento.

### Opção 2: Mercado Pago (Automático)

1. Obtenha credenciais em: https://www.mercadopago.com.br/developers
2. Acesse: **Dashboard** → **Pagamentos** → **Métodos**
3. Adicione método **"Mercado Pago"**
4. Cole Public Key e Access Token
5. Configure webhook: `https://seudominio.com/api/webhooks/mercadopago`

### Opção 3: Asaas (Automático)

1. Obtenha API Key em: https://www.asaas.com
2. Acesse: **Dashboard** → **Pagamentos** → **Métodos**
3. Adicione método **"Asaas"**
4. Cole API Key e Chave PIX
5. Configure webhook: `https://seudominio.com/api/webhooks/asaas`

---

## 📱 Atualizar Template WhatsApp

1. Acesse: **Dashboard** → **WhatsApp** → **Templates**
2. Edite template **"Fatura Disponível"**
3. Adicione no final da mensagem:

```
🔗 Pagar agora:
{{link_fatura}}

Pagamento via PIX instantâneo! ⚡
```

4. Salvar

---

## ✅ Testar

### Teste 1: Gerar Fatura Manual

1. Vá em **Clientes**
2. Selecione um cliente
3. Clique em **"Gerar Fatura"**
4. Verifique se o link de pagamento foi gerado

### Teste 2: Acessar Link

1. Copie o link da fatura
2. Abra em uma aba anônima
3. Verifique se o checkout abre corretamente

### Teste 3: WhatsApp

1. Aguarde o processador gerar uma fatura automaticamente
2. Verifique se o WhatsApp foi enviado com o link

---

## 🐛 Problemas Comuns

### Link não é gerado

```sql
-- Verificar se tem método ativo
SELECT * FROM payment_methods WHERE is_active = TRUE;
```

Se não tiver, configure um método.

### Checkout não abre

Verifique se a URL está correta no `.env`:
```env
APP_URL=https://seudominio.com  # SEM barra no final
```

### WhatsApp sem link

Execute a migration 005:
```bash
mysql -u root -p iptv_manager < database/migrations/005_update_whatsapp_templates_payment_link.sql
```

---

## 📊 Verificar Funcionamento

```sql
-- Ver métodos configurados
SELECT method_type, is_active, is_default 
FROM payment_methods;

-- Ver transações de hoje
SELECT pt.method_type, pt.status, COUNT(*) as total
FROM payment_transactions pt
WHERE DATE(pt.created_at) = CURDATE()
GROUP BY pt.method_type, pt.status;

-- Ver webhooks recebidos
SELECT method_type, event_type, processed, COUNT(*) as total
FROM payment_webhooks
WHERE DATE(created_at) = CURDATE()
GROUP BY method_type, event_type, processed;
```

---

## 📚 Documentação Completa

Para mais detalhes, consulte: `docs/payment-methods-guide.md`

---

## 🎉 Pronto!

Seu sistema de pagamentos está configurado e funcionando!

**Próximos passos**:
1. ✅ Configurar pelo menos um método
2. ✅ Atualizar template WhatsApp
3. ✅ Testar com uma fatura
4. ✅ Monitorar logs e webhooks

---

**Desenvolvido com ❤️ para GestPlay**
