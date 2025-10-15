# 📧 Configurar Email para Produção

## 🚀 Opção 1: Gmail SMTP (Recomendado)

### Passo 1: Instalar PHPMailer

```bash
cd /caminho/do/projeto
composer require phpmailer/phpmailer
```

### Passo 2: Criar Senha de App no Gmail

1. Acesse sua conta Google: https://myaccount.google.com
2. Vá em **Segurança**
3. Ative **Verificação em duas etapas** (se ainda não estiver ativa)
4. Procure por **Senhas de app**
5. Selecione:
   - **App**: Outro (nome personalizado)
   - **Nome**: UltraGestor
6. Clique em **Gerar**
7. **Copie a senha gerada** (16 caracteres sem espaços)

### Passo 3: Configurar .env

Adicione no arquivo `.env`:

```env
# Configurações de Email
MAIL_USE_SMTP=true
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=seu-email@gmail.com
MAIL_PASSWORD=xxxx xxxx xxxx xxxx
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@seudominio.com
MAIL_FROM_NAME=UltraGestor
```

**Importante:**
- Use a **senha de app** gerada, não sua senha normal do Gmail
- Remova os espaços da senha de app

### Passo 4: Testar

```bash
# Via linha de comando
curl -X POST http://seu-dominio.com/api/password-reset \
  -H "Content-Type: application/json" \
  -d '{"email":"seu-email@gmail.com"}'
```

Ou acesse:
```
http://seu-dominio.com/forgot-password
```

---

## 🚀 Opção 2: SendGrid (100 emails/dia grátis)

### Passo 1: Criar Conta

1. Acesse: https://sendgrid.com
2. Crie uma conta gratuita
3. Verifique seu email

### Passo 2: Criar API Key

1. No painel do SendGrid, vá em **Settings** → **API Keys**
2. Clique em **Create API Key**
3. Nome: `UltraGestor`
4. Permissões: **Full Access**
5. Clique em **Create & View**
6. **Copie a API Key** (só aparece uma vez!)

### Passo 3: Verificar Domínio (Opcional mas Recomendado)

1. Vá em **Settings** → **Sender Authentication**
2. Clique em **Verify a Single Sender**
3. Preencha seus dados
4. Verifique o email de confirmação

### Passo 4: Configurar .env

```env
# Configurações de Email - SendGrid
MAIL_USE_SMTP=true
MAIL_HOST=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USERNAME=apikey
MAIL_PASSWORD=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@seudominio.com
MAIL_FROM_NAME=UltraGestor
```

**Importante:**
- Username é sempre `apikey` (literal)
- Password é a API Key que você copiou

---

## 🚀 Opção 3: Mailgun (5.000 emails/mês grátis)

### Passo 1: Criar Conta

1. Acesse: https://www.mailgun.com
2. Crie uma conta gratuita
3. Verifique seu email

### Passo 2: Adicionar Domínio

1. No painel, vá em **Sending** → **Domains**
2. Adicione seu domínio
3. Configure os registros DNS (MX, TXT, CNAME)
4. Aguarde verificação (pode levar até 48h)

### Passo 3: Pegar Credenciais SMTP

1. Clique no seu domínio
2. Vá na aba **SMTP**
3. Copie as credenciais

### Passo 4: Configurar .env

```env
# Configurações de Email - Mailgun
MAIL_USE_SMTP=true
MAIL_HOST=smtp.mailgun.org
MAIL_PORT=587
MAIL_USERNAME=postmaster@seu-dominio.com
MAIL_PASSWORD=sua-senha-smtp
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@seu-dominio.com
MAIL_FROM_NAME=UltraGestor
```

---

## 🚀 Opção 4: SMTP do Servidor (cPanel/Plesk)

Se seu servidor tem cPanel ou Plesk:

### Passo 1: Criar Conta de Email

1. No cPanel, vá em **Contas de Email**
2. Crie: `noreply@seudominio.com`
3. Defina uma senha forte

### Passo 2: Configurar .env

```env
# Configurações de Email - Servidor
MAIL_USE_SMTP=true
MAIL_HOST=mail.seudominio.com
MAIL_PORT=587
MAIL_USERNAME=noreply@seudominio.com
MAIL_PASSWORD=senha-da-conta-email
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@seudominio.com
MAIL_FROM_NAME=UltraGestor
```

---

## ✅ Verificar Configuração

### 1. Verificar se PHPMailer está instalado

```bash
ls -la vendor/phpmailer/phpmailer
```

Se não existir:
```bash
composer require phpmailer/phpmailer
```

### 2. Verificar .env

```bash
cat .env | grep MAIL
```

Deve mostrar:
```
MAIL_USE_SMTP=true
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=seu-email@gmail.com
MAIL_PASSWORD=xxxx xxxx xxxx xxxx
...
```

### 3. Testar Envio

Crie um arquivo `test-email.php` na raiz:

```php
<?php
require_once __DIR__ . '/api/lib/email-sender.php';

$emailSender = new EmailSender();
$sent = $emailSender->sendPasswordResetEmail(
    'seu-email@gmail.com',  // Seu email para teste
    'Teste',
    'token-fake-123',
    60
);

if ($sent) {
    echo "✅ Email enviado com sucesso! Verifique sua caixa de entrada.";
} else {
    echo "❌ Falha ao enviar email. Verifique os logs.";
}
```

Execute:
```bash
php test-email.php
```

---

## 🐛 Troubleshooting

### Erro: "SMTP connect() failed"

**Causa:** Credenciais incorretas ou porta bloqueada

**Solução:**
1. Verifique username e password no .env
2. Tente porta 465 com SSL:
   ```env
   MAIL_PORT=465
   MAIL_ENCRYPTION=ssl
   ```
3. Verifique se o firewall não está bloqueando

### Erro: "Could not authenticate"

**Causa:** Senha incorreta

**Solução:**
- Gmail: Use senha de app, não sua senha normal
- SendGrid: Verifique se copiou a API Key completa
- Servidor: Verifique a senha da conta de email

### Erro: "Sender address rejected"

**Causa:** Email de remetente não verificado

**Solução:**
1. Use um email do mesmo domínio do SMTP
2. Ou verifique o remetente no painel do serviço

### Email vai para SPAM

**Solução:**
1. Configure SPF, DKIM e DMARC no DNS
2. Use um domínio verificado
3. Evite palavras como "grátis", "promoção" no assunto
4. Adicione link de unsubscribe

---

## 📊 Comparação de Serviços

| Serviço | Grátis | Limite | Facilidade | Recomendado |
|---------|--------|--------|------------|-------------|
| **Gmail** | ✅ Sim | 500/dia | ⭐⭐⭐⭐⭐ | ✅ Desenvolvimento |
| **SendGrid** | ✅ Sim | 100/dia | ⭐⭐⭐⭐ | ✅ Produção |
| **Mailgun** | ✅ Sim | 5.000/mês | ⭐⭐⭐⭐ | ✅ Produção |
| **SMTP Servidor** | ✅ Sim | Ilimitado* | ⭐⭐⭐ | ⚠️ Pode ir para spam |

*Depende do plano de hospedagem

---

## 🎯 Recomendação Final

### Para Começar (Hoje):
**Use Gmail SMTP** - Rápido de configurar, funciona bem

### Para Produção (Escalável):
**Use SendGrid ou Mailgun** - Melhor entregabilidade, estatísticas, sem limite diário baixo

---

## 📝 Checklist de Produção

- [ ] PHPMailer instalado (`composer require phpmailer/phpmailer`)
- [ ] Variáveis MAIL_* configuradas no .env
- [ ] Senha de app criada (Gmail) ou API Key (SendGrid)
- [ ] Email de teste enviado com sucesso
- [ ] SPF/DKIM configurados no DNS (opcional mas recomendado)
- [ ] Template de email testado em diferentes clientes (Gmail, Outlook, etc)
- [ ] Link de reset testado e funcionando
- [ ] Remover arquivos de debug (`test-*.php`, `api/resources/debug-*.php`)

---

**Desenvolvido com ❤️ para o UltraGestor**
