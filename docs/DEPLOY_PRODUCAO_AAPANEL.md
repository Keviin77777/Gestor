# 🚀 Deploy em Produção - aaPanel (Guia Completo)

## 📋 Pré-requisitos

✅ VPS com Ubuntu 20.04+ ou CentOS 7+  
✅ aaPanel instalado e configurado  
✅ Domínio apontando para o IP da VPS  
✅ Acesso SSH root  

---

## 🎯 PASSO 1: Preparar o aaPanel

### 1.1 Instalar Extensões Necessárias

Acesse: **aaPanel → App Store**

Instale:
- ✅ **Nginx** (ou Apache)
- ✅ **PHP 8.1** ou superior
- ✅ **MySQL 5.7** ou superior
- ✅ **phpMyAdmin** (opcional, para gerenciar banco)
- ✅ **PM2 Manager** (para processos Node.js)
- ✅ **SSL** (Let's Encrypt)

### 1.2 Configurar PHP

**aaPanel → App Store → PHP 8.1 → Settings**

Ative as extensões:
```
✅ pdo_mysql
✅ mysqli
✅ curl
✅ json
✅ mbstring
✅ openssl
✅ fileinfo
✅ zip
```

Ajuste configurações em **php.ini**:
```ini
upload_max_filesize = 50M
post_max_size = 50M
max_execution_time = 300
memory_limit = 256M
```

### 1.3 Instalar Node.js

Via SSH:
```bash
# Instalar Node.js 18 LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar instalação
node -v
npm -v

# Instalar PM2 globalmente
sudo npm install -g pm2
```

### 1.4 Instalar Composer

Via SSH:
```bash
# Baixar e instalar Composer
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
sudo chmod +x /usr/local/bin/composer

# Verificar
composer --version
```

---

## 🎯 PASSO 2: Criar Site no aaPanel

### 2.1 Adicionar Site

**aaPanel → Website → Add Site**

Configurações:
```
Domain: seudominio.com
Root Directory: /www/wwwroot/seudominio.com
PHP Version: PHP 8.1
Database: Create (nome: gestplay_db)
```

### 2.2 Configurar SSL

**aaPanel → Website → seudominio.com → SSL**

1. Selecione **Let's Encrypt**
2. Marque seu domínio
3. Clique em **Apply**
4. Ative **Force HTTPS**

---

## 🎯 PASSO 3: Fazer Upload do Projeto

### 3.1 Via Git (Recomendado)

Via SSH:
```bash
# Navegar para o diretório do site
cd /www/wwwroot/seudominio.com

# Remover arquivos padrão
rm -rf *

# Clonar seu repositório
git clone https://github.com/seu-usuario/seu-repo.git .

# Ou fazer upload via FTP/SFTP
```

### 3.2 Via FTP/SFTP

Use FileZilla ou WinSCP:
```
Host: seu-ip-vps
Port: 21 (FTP) ou 22 (SFTP)
User: root (ou usuário aaPanel)
Password: sua-senha
```

Faça upload de todos os arquivos para:
```
/www/wwwroot/seudominio.com/
```

---

## 🎯 PASSO 4: Configurar Banco de Dados

### 4.1 Criar Banco via aaPanel

**aaPanel → Database → Add Database**

```
Database Name: gestplay_db
Username: gestplay_user
Password: [gere uma senha forte]
```

### 4.2 Importar Schema

Via **phpMyAdmin** ou SSH:

```bash
cd /www/wwwroot/seudominio.com

# Importar schema principal
mysql -u gestplay_user -p gestplay_db < database/INSTALAR_WORKBENCH.sql

# Executar migrations em ordem
mysql -u gestplay_user -p gestplay_db < database/migrations/001_create_whatsapp_reminder_tables.sql
mysql -u gestplay_user -p gestplay_db < database/migrations/002_add_template_scheduling.sql
mysql -u gestplay_user -p gestplay_db < database/migrations/003_unified_templates_system.sql
mysql -u gestplay_user -p gestplay_db < database/migrations/004_payment_methods.sql
mysql -u gestplay_user -p gestplay_db < database/migrations/005_update_whatsapp_templates_payment_link.sql
mysql -u gestplay_user -p gestplay_db < database/migrations/006_reseller_subscriptions.sql
mysql -u gestplay_user -p gestplay_db < database/migrations/007_admin_and_reseller_whatsapp.sql
mysql -u gestplay_user -p gestplay_db < database/migrations/008_default_client_templates.sql
mysql -u gestplay_user -p gestplay_db < database/migrations/009_admin_payment_methods.sql
mysql -u gestplay_user -p gestplay_db < database/migrations/010_trial_system.sql
mysql -u gestplay_user -p gestplay_db < database/migrations/012_password_reset_tokens.sql
```

Ou via phpMyAdmin:
1. Acesse phpMyAdmin
2. Selecione o banco `gestplay_db`
3. Vá em **Import**
4. Faça upload de cada arquivo SQL em ordem

---

## 🎯 PASSO 5: Configurar Variáveis de Ambiente

### 5.1 Criar arquivo .env

Via SSH:
```bash
cd /www/wwwroot/seudominio.com
cp .env.example .env
nano .env
```

### 5.2 Configurar .env

```env
# Application
APP_ENV=production
APP_URL=https://seudominio.com
FRONTEND_URL=https://seudominio.com

# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=gestplay_db
DB_USER=gestplay_user
DB_PASS=sua_senha_do_banco

# Security (GERE NOVAS CHAVES!)
JWT_SECRET=sua_chave_jwt_super_segura_min_32_chars
ENCRYPTION_KEY=sua_chave_criptografia_min_32_chars

# URLs da API
NEXT_PUBLIC_PHP_API_URL=https://seudominio.com/api

# Mercado Pago (PRODUÇÃO)
MP_PUBLIC_KEY=APP-sua-public-key-producao
MP_ACCESS_TOKEN=APP-seu-access-token-producao

# Asaas (PRODUÇÃO)
ASAAS_API_KEY=sua-api-key-producao
ASAAS_PIX_KEY=sua-chave-pix

# WhatsApp Evolution API
WHATSAPP_API_URL=http://localhost:8081
WHATSAPP_API_KEY=gestplay-whatsapp-2024

# Email SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-app-gmail
SMTP_FROM=noreply@seudominio.com
SMTP_FROM_NAME=GestPlay

# Session
SESSION_LIFETIME=604800
SESSION_SECURE=true
SESSION_HTTPONLY=true
SESSION_SAMESITE=strict

# CORS
CORS_ALLOWED_ORIGINS=https://seudominio.com
```

**⚠️ IMPORTANTE:** Gere chaves seguras:
```bash
# JWT_SECRET
openssl rand -hex 32

# ENCRYPTION_KEY
openssl rand -hex 32
```

### 5.3 Configurar .env.evolution

```bash
nano .env.evolution
```

```env
# Evolution API Configuration
EVOLUTION_API_URL=http://localhost:8081
EVOLUTION_API_KEY=gestplay-whatsapp-2024
EVOLUTION_INSTANCE_NAME=gestplay-instance
```

---

## 🎯 PASSO 6: Instalar Dependências

### 6.1 Dependências PHP

```bash
cd /www/wwwroot/seudominio.com
composer install --no-dev --optimize-autoloader
```

### 6.2 Dependências Frontend

```bash
npm install --production
```

### 6.3 Dependências dos Scripts

```bash
cd scripts
npm install
cd ..
```

---

## 🎯 PASSO 7: Build do Frontend

```bash
cd /www/wwwroot/seudominio.com

# Build de produção
npm run build

# Testar build
npm start
```

O Next.js rodará na porta **3000** por padrão.

---

## 🎯 PASSO 8: Configurar Nginx

### 8.1 Editar Configuração do Site

**aaPanel → Website → seudominio.com → Config**

Substitua por:

```nginx
server {
    listen 80;
    listen 443 ssl http2;
    server_name seudominio.com www.seudominio.com;
    
    # SSL (gerenciado pelo aaPanel)
    ssl_certificate /www/server/panel/vhost/cert/seudominio.com/fullchain.pem;
    ssl_certificate_key /www/server/panel/vhost/cert/seudominio.com/privkey.pem;
    
    # Redirecionar HTTP para HTTPS
    if ($scheme = http) {
        return 301 https://$server_name$request_uri;
    }
    
    # Root do projeto
    root /www/wwwroot/seudominio.com;
    index index.html index.php;
    
    # Logs
    access_log /www/wwwlogs/seudominio.com.log;
    error_log /www/wwwlogs/seudominio.com.error.log;
    
    # Frontend Next.js (porta 3000)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Backend PHP API
    location /api {
        alias /www/wwwroot/seudominio.com/api;
        index index.php;
        
        # Tentar arquivo, depois diretório, depois index.php
        try_files $uri $uri/ /api/index.php?$query_string;
        
        # PHP-FPM
        location ~ \.php$ {
            fastcgi_pass unix:/tmp/php-cgi-81.sock;
            fastcgi_index index.php;
            fastcgi_param SCRIPT_FILENAME /www/wwwroot/seudominio.com/api$fastcgi_script_name;
            include fastcgi_params;
        }
    }
    
    # Bloquear acesso a arquivos sensíveis
    location ~ /\. {
        deny all;
    }
    
    location ~ \.(env|git|sql|md)$ {
        deny all;
    }
}
```

Salve e reinicie Nginx:
```bash
sudo systemctl restart nginx
```

---

## 🎯 PASSO 9: Configurar PM2 (Processos Node.js)

### 9.1 Criar arquivo ecosystem

```bash
cd /www/wwwroot/seudominio.com
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [
    // Frontend Next.js
    {
      name: 'gestplay-frontend',
      script: 'npm',
      args: 'start',
      cwd: '/www/wwwroot/seudominio.com',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    },
    
    // WhatsApp Evolution Server
    {
      name: 'whatsapp-evolution',
      script: './scripts/whatsapp-evolution-server.js',
      cwd: '/www/wwwroot/seudominio.com',
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M'
    },
    
    // Reminder Processor
    {
      name: 'reminder-processor',
      script: './scripts/reminder-processor.js',
      cwd: '/www/wwwroot/seudominio.com',
      env: {
        NODE_ENV: 'production',
        PORT: 3003
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M'
    },
    
    // Invoice Processor
    {
      name: 'invoice-processor',
      script: './scripts/invoice-processor.js',
      cwd: '/www/wwwroot/seudominio.com',
      env: {
        NODE_ENV: 'production',
        PORT: 3004
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M'
    },
    
    // Subscription Processor
    {
      name: 'subscription-processor',
      script: './scripts/subscription-processor.js',
      cwd: '/www/wwwroot/seudominio.com',
      env: {
        NODE_ENV: 'production',
        PORT: 3005
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M'
    }
  ]
};
```

### 9.2 Iniciar Processos

```bash
cd /www/wwwroot/seudominio.com

# Iniciar todos os processos
pm2 start ecosystem.config.js

# Salvar configuração
pm2 save

# Configurar para iniciar no boot
pm2 startup
# Copie e execute o comando que aparecer

# Verificar status
pm2 status

# Ver logs
pm2 logs
```

---

## 🎯 PASSO 10: Configurar Evolution API (WhatsApp)

### 10.1 Instalar Docker (se não tiver)

```bash
# Instalar Docker
curl -fsSL https://get.docker.com | sh

# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER

# Verificar
docker --version
```

### 10.2 Iniciar Evolution API

```bash
cd /www/wwwroot/seudominio.com

# Iniciar container
docker-compose -f docker-compose-evolution.yml up -d

# Verificar se está rodando
docker ps

# Ver logs
docker logs evolution-api
```

### 10.3 Conectar WhatsApp

1. Acesse: `http://seu-ip:8081`
2. Use a API Key: `gestplay-whatsapp-2024`
3. Crie uma instância
4. Escaneie o QR Code com WhatsApp

---

## 🎯 PASSO 11: Configurar Cron Jobs

### 11.1 Via aaPanel

**aaPanel → Cron**

Adicione:

**1. Gerar Faturas Automáticas (a cada hora)**
```
Type: Shell Script
Name: Gerar Faturas
Execution Cycle: Every 1 hour
Script:
cd /www/wwwroot/seudominio.com && /usr/bin/php api/cron/auto-generate-invoices.php
```

**2. Processar Lembretes (a cada 5 minutos)**
```
Type: Shell Script
Name: Processar Lembretes
Execution Cycle: Every 5 minutes
Script:
cd /www/wwwroot/seudominio.com && /usr/bin/php api/cron/auto-process-reminders.php
```

### 11.2 Via SSH (alternativa)

```bash
crontab -e
```

Adicione:
```cron
# Gerar faturas a cada hora
0 * * * * cd /www/wwwroot/seudominio.com && /usr/bin/php api/cron/auto-generate-invoices.php

# Processar lembretes a cada 5 minutos
*/5 * * * * cd /www/wwwroot/seudominio.com && /usr/bin/php api/cron/auto-process-reminders.php
```

---

## 🎯 PASSO 12: Configurar Webhooks

### 12.1 URLs dos Webhooks

Configure nos gateways de pagamento:

**Mercado Pago:**
```
https://seudominio.com/api/webhooks/mercadopago
```

**Asaas:**
```
https://seudominio.com/api/webhooks/asaas
```

### 12.2 Testar Webhooks

```bash
# Testar Mercado Pago
curl -X POST https://seudominio.com/api/webhooks/mercadopago \
  -H "Content-Type: application/json" \
  -d '{"action":"payment.created","data":{"id":"123456"}}'

# Testar Asaas
curl -X POST https://seudominio.com/api/webhooks/asaas \
  -H "Content-Type: application/json" \
  -d '{"event":"PAYMENT_RECEIVED","payment":{"id":"pay_123"}}'
```

---

## 🎯 PASSO 13: Configurar Permissões

```bash
cd /www/wwwroot/seudominio.com

# Dar permissão de escrita
chmod -R 755 storage/
chmod -R 755 exports/
chmod -R 755 scripts/whatsapp-sessions/

# Proprietário correto
chown -R www:www /www/wwwroot/seudominio.com
```

---

## 🎯 PASSO 14: Testar Sistema

### 14.1 Verificar Serviços

```bash
# PM2
pm2 status

# Docker (Evolution API)
docker ps

# Nginx
sudo systemctl status nginx

# MySQL
sudo systemctl status mysql
```

### 14.2 Acessar Sistema

1. **Frontend:** https://seudominio.com
2. **Login padrão:**
   - Email: `admin@admin.com`
   - Senha: `admin123`

⚠️ **ALTERE A SENHA IMEDIATAMENTE!**

### 14.3 Testar Funcionalidades

✅ Login/Logout  
✅ Criar cliente  
✅ Gerar fatura  
✅ Enviar WhatsApp  
✅ Processar pagamento  
✅ Renovar no Sigma  

---

## 🎯 PASSO 15: Monitoramento

### 15.1 Ver Logs em Tempo Real

```bash
# PM2 (todos)
pm2 logs

# PM2 (específico)
pm2 logs gestplay-frontend
pm2 logs whatsapp-evolution
pm2 logs reminder-processor

# Nginx
tail -f /www/wwwlogs/seudominio.com.error.log

# PHP
tail -f /www/server/php/81/var/log/php-fpm.log

# MySQL
tail -f /www/server/data/mysql_error.log
```

### 15.2 Monitorar Recursos

```bash
# CPU e Memória
pm2 monit

# Disco
df -h

# Processos
htop
```

---

## 🔒 PASSO 16: Segurança

### 16.1 Firewall

```bash
# Permitir apenas portas necessárias
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 8888/tcp  # aaPanel
sudo ufw enable
```

### 16.2 Fail2Ban

```bash
# Instalar
sudo apt install fail2ban -y

# Configurar
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 16.3 Backup Automático

**aaPanel → Cron → Add**

```
Type: Backup Database
Name: Backup Diário
Execution Cycle: Daily at 3:00 AM
Database: gestplay_db
Retention: 7 days
```

---

## 📊 PASSO 17: Otimizações

### 17.1 Cache do Next.js

Já configurado automaticamente no build.

### 17.2 Compressão Gzip (Nginx)

Adicione no nginx.conf:
```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;
```

### 17.3 OPcache (PHP)

**aaPanel → PHP 8.1 → Settings → Configuration File**

```ini
opcache.enable=1
opcache.memory_consumption=128
opcache.interned_strings_buffer=8
opcache.max_accelerated_files=10000
opcache.revalidate_freq=2
```

---

## 🆘 Troubleshooting

### Erro: "502 Bad Gateway"

```bash
# Verificar se Next.js está rodando
pm2 status gestplay-frontend

# Reiniciar
pm2 restart gestplay-frontend

# Ver logs
pm2 logs gestplay-frontend
```

### Erro: "Connection refused" (API)

```bash
# Verificar PHP-FPM
sudo systemctl status php-fpm-81

# Reiniciar
sudo systemctl restart php-fpm-81
```

### WhatsApp não conecta

```bash
# Verificar Evolution API
docker ps
docker logs evolution-api

# Reiniciar
docker restart evolution-api
```

### Banco de dados não conecta

```bash
# Verificar MySQL
sudo systemctl status mysql

# Testar conexão
mysql -u gestplay_user -p gestplay_db
```

---

## ✅ Checklist Final

- [ ] aaPanel instalado e configurado
- [ ] PHP 8.1+ com extensões necessárias
- [ ] MySQL rodando e banco importado
- [ ] Node.js 18+ e PM2 instalados
- [ ] Composer instalado
- [ ] Projeto clonado/enviado
- [ ] .env configurado com chaves seguras
- [ ] Dependências instaladas (PHP, Node, Scripts)
- [ ] Frontend buildado (npm run build)
- [ ] Nginx configurado corretamente
- [ ] SSL ativado (HTTPS)
- [ ] PM2 rodando todos os processos
- [ ] Evolution API rodando (Docker)
- [ ] WhatsApp conectado
- [ ] Cron jobs configurados
- [ ] Webhooks configurados nos gateways
- [ ] Permissões corretas nos diretórios
- [ ] Firewall configurado
- [ ] Backup automático ativado
- [ ] Sistema testado e funcionando
- [ ] Senha admin alterada

---

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs: `pm2 logs`
2. Consulte a documentação: `docs/`
3. Entre em contato com suporte

---

**🎉 Parabéns! Seu sistema está em produção!**

