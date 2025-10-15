# 🧪 Como Testar a Recuperação de Senha

## 📋 Problema Atual

O PHP precisa de um servidor SMTP configurado para enviar emails. Em desenvolvimento local, a função `mail()` geralmente não funciona.

## ✅ Soluções para Testar

### Opção 1: Script de Teste (Recomendado para Dev)

1. **Acesse o script de teste:**
   ```
   http://localhost:8080/test-password-reset.php
   ```

2. **O script irá:**
   - ✅ Verificar se o usuário existe
   - ✅ Gerar um token de recuperação
   - ✅ Mostrar o link de reset
   - ✅ Tentar enviar email
   - ✅ Mostrar configuração do PHP
   - ✅ Listar tokens no banco

3. **Copie o link gerado** e cole no navegador para testar

### Opção 2: API de Debug

1. **Solicite o reset normalmente:**
   ```
   http://localhost:9002/forgot-password
   ```

2. **Busque o token via API:**
   ```bash
   curl "http://localhost:8080/api/debug-reset-tokens?email=admin@admin.com"
   ```

3. **Copie o `reset_link` da resposta**

### Opção 3: Consultar Banco Diretamente

```sql
SELECT 
    email,
    token,
    expires_at,
    used,
    CONCAT('http://localhost:9002/reset-password?token=', token) as reset_link
FROM password_reset_tokens
WHERE email = 'admin@admin.com'
  AND used = FALSE
  AND expires_at > NOW()
ORDER BY created_at DESC
LIMIT 1;
```

---

## 🔧 Configurar Email Real (Produção)

### Opção A: Gmail SMTP

1. **Instale PHPMailer:**
   ```bash
   composer require phpmailer/phpmailer
   ```

2. **Configure no `.env`:**
   ```env
   MAIL_USE_SMTP=true
   MAIL_HOST=smtp.gmail.com
   MAIL_PORT=587
   MAIL_USERNAME=seu-email@gmail.com
   MAIL_PASSWORD=sua-senha-app
   MAIL_ENCRYPTION=tls
   MAIL_FROM_ADDRESS=noreply@seudominio.com
   MAIL_FROM_NAME=UltraGestor
   ```

3. **Crie senha de app no Gmail:**
   - Acesse: https://myaccount.google.com/apppasswords
   - Gere uma senha de app
   - Use essa senha no `.env`

### Opção B: SendGrid

1. **Crie conta grátis:**
   - https://sendgrid.com (100 emails/dia grátis)

2. **Configure no `.env`:**
   ```env
   MAIL_USE_SMTP=true
   MAIL_HOST=smtp.sendgrid.net
   MAIL_PORT=587
   MAIL_USERNAME=apikey
   MAIL_PASSWORD=SUA_API_KEY_AQUI
   MAIL_ENCRYPTION=tls
   ```

### Opção C: Mailtrap (Apenas Testes)

1. **Crie conta grátis:**
   - https://mailtrap.io

2. **Configure no `.env`:**
   ```env
   MAIL_USE_SMTP=true
   MAIL_HOST=smtp.mailtrap.io
   MAIL_PORT=2525
   MAIL_USERNAME=seu-username
   MAIL_PASSWORD=sua-senha
   ```

3. **Emails ficam na caixa do Mailtrap** (não chegam de verdade)

---

## 🧪 Fluxo de Teste Completo

### 1. Solicitar Reset
```bash
curl -X POST http://localhost:8080/api/password-reset \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@admin.com"}'
```

**Resposta esperada:**
```json
{
  "success": true,
  "message": "Se o email estiver cadastrado, você receberá instruções..."
}
```

### 2. Pegar Token (Dev)
```bash
curl "http://localhost:8080/api/debug-reset-tokens?email=admin@admin.com"
```

**Resposta:**
```json
{
  "success": true,
  "email": "admin@admin.com",
  "tokens": [
    {
      "token": "abc123...",
      "reset_link": "http://localhost:9002/reset-password?token=abc123...",
      "valid": true,
      "expired": false,
      "used": false
    }
  ]
}
```

### 3. Validar Token
```bash
curl "http://localhost:8080/api/password-reset?token=abc123..."
```

**Resposta:**
```json
{
  "success": true,
  "email": "admin@admin.com",
  "name": "Admin"
}
```

### 4. Redefinir Senha
```bash
curl -X PUT http://localhost:8080/api/password-reset \
  -H "Content-Type: application/json" \
  -d '{
    "token":"abc123...",
    "password":"novaSenha123"
  }'
```

**Resposta:**
```json
{
  "success": true,
  "message": "Senha redefinida com sucesso"
}
```

### 5. Fazer Login com Nova Senha
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"admin@admin.com",
    "password":"novaSenha123"
  }'
```

---

## 🔒 Segurança

### Implementado:
- ✅ Tokens únicos de 64 caracteres
- ✅ Expiração em 1 hora
- ✅ Token usado apenas uma vez
- ✅ Tokens antigos invalidados ao solicitar novo
- ✅ Senha forte obrigatória (8+ chars, letras + números)
- ✅ Mensagem genérica (não revela se email existe)
- ✅ Log de IP e User Agent

### Recomendações Adicionais:
- [ ] Rate limiting (máx 3 tentativas por hora)
- [ ] Captcha após 3 tentativas
- [ ] Notificar usuário por email quando senha for alterada
- [ ] 2FA opcional

---

## 📝 Checklist de Teste

- [ ] Solicitar reset com email válido
- [ ] Solicitar reset com email inválido
- [ ] Validar token válido
- [ ] Validar token expirado
- [ ] Validar token já usado
- [ ] Redefinir senha com token válido
- [ ] Tentar usar mesmo token duas vezes
- [ ] Fazer login com nova senha
- [ ] Verificar que senha antiga não funciona mais

---

## 🐛 Troubleshooting

### Email não chega
- ✅ Use o script de teste para pegar o link
- ✅ Verifique logs do PHP: `tail -f /var/log/php_errors.log`
- ✅ Configure SMTP real (Gmail, SendGrid)

### Token inválido
- ✅ Verifique se não expirou (1 hora)
- ✅ Verifique se não foi usado
- ✅ Gere novo token

### Erro ao redefinir senha
- ✅ Senha deve ter 8+ caracteres
- ✅ Senha deve ter letras E números
- ✅ Senhas devem coincidir

---

**Desenvolvido com ❤️ para o UltraGestor**
