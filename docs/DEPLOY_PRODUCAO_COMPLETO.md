# 🚀 Deploy Completo em Produção (Tudo no Mesmo Servidor)

## 📋 Arquitetura

**1 Servidor VPS rodando:**
- ✅ Next.js (Frontend) - Porta 3000
- ✅ PHP API (Backend) - Porta 8080
- ✅ MySQL (Banco de Dados) - Porta 3306
- ✅ Evolution API (WhatsApp) - Porta 8081
- ✅ Nginx (Proxy Reverso) - Portas 80/443

**Custo Total: R$ 22-30/mês** (1 servidor para tudo!)

---

## 🖥️ Requisitos do Servidor

### Mínimo:
- **2GB RAM**
- **2 CPU Cores**
- **40GB SSD**
- **Ubuntu 22.04**

### Recomendado:
- **4GB RAM** ← Melhor
- **2 CPU Cores**
- **80GB SSD**
- **Ubuntu 22.04**

### Onde Contratar:

1. **Contabo** - €4/mês (~R$ 22) ⭐ Melhor custo-benefício
   - 4GB RAM, 200GB SSD
   - https://contabo.com

2. **DigitalOcean** - $12/mês (~R$ 60)
   - 2GB RAM, 50GB SSD
   - https://digitalocean.com

3. **Vultr** - $12/mês (~R$ 60)
   - 2GB RAM, 55GB SSD
   - https://vultr.com

---

## 📦 Instalação Completa

### 1. Conectar no Servidor

```bash
ssh root@seu-servidor-ip
```

### 2. Atualizar Sistema

```bash
apt update && apt upgrade -y
```

### 3. Instalar Dependências

```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# PHP 8.2
apt install -y software-properties-common
add-apt-repository ppa:ondrej/php -y
apt update
apt install -y php8.2 php8.2-fpm php8.2-mysql php8.2-curl php8.2-mbstring php8.2-xml

# MySQL
apt install -y mysql-server

# Nginx
apt install -y nginx

# Docker
curl -fsSL https://get.docker.com | sh

# PM2 (gerenciador de processos)
npm install -g pm2

# Certbot (SSL)
apt install -y certbot python3-certbot-nginx
```

### 4. Configurar MySQL

```bash
# Iniciar MySQL
systemctl start mysql
systemctl enable mysql

# Configurar senha root
mysql_secure_installation

# Criar banco de dados
mysql -u root -p
```

```sql
CREATE DATABASE iptv_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'iptv_user'@'localhost' IDENTIFIED BY 'senha-forte-aqui';
GRANT ALL PRIVILEGES ON iptv_manager.* TO 'iptv_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 5. Clonar Projeto

```bash
cd /var/www
git clone seu-repositorio gestor
cd gestor
```

### 6. Configurar .env

```bash
nano .env
```

```env
# Application
APP_ENV=production
APP_URL=https://seudominio.com
FRONTEND_URL=https://seudominio.com

# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=iptv_manager
DB_USER=iptv_user
DB_PASS=senha-forte-aqui

# APIs
NEXT_PUBLIC_API_URL=https://seudominio.com
NEXT_PUBLIC_PHP_API_URL=https://seudominio.com/api

# Evolution API (mesmo servidor!)
EVOLUTION_API_URL=http://localhost:8081
EVOLUTION_API_KEY=gestplay-whatsapp-2024
NEXT_PUBLIC_WHATSAPP_API_URL=https://seudominio.com/whatsapp

# Email
MAIL_USE_SMTP=true
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=seu-email@gmail.com
MAIL_PASSWORD=sua-senha-app
MAIL_ENCRYPTION=tls
```

### 7. Instalar Dependências

```bash
npm install
npm run build
```

### 8. Importar Banco de Dados

```bash
mysql -u iptv_user -p iptv_manager < database/schema.sql
```

### 9. Iniciar Evolution API

```bash
# Editar docker-compose
nano docker-compose-evolution.yml
```

Mude a porta para 8081:
```yaml
ports:
  - "8081:8080"  # Porta 8081 externa
```

```bash
# Iniciar
docker-compose -f docker-compose-evolution.yml up -d
```

### 10. Configurar PM2

```bash
# Criar arquivo de configuração
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [
    {
      name: 'gestor-frontend',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/gestor',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'whatsapp-proxy',
      script: 'scripts/whatsapp-evolution-server.js',
      cwd: '/var/www/gestor',
      env: {
        PORT: 3002
      }
    }
  ]
};
```

```bash
# Iniciar aplicações
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 11. Configurar Nginx

```bash
nano /etc/nginx/sites-available/gestor
```

```nginx
# Frontend (Next.js)
server {
    listen 80;
    server_name seudominio.com www.seudominio.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # PHP API
    location /api {
        alias /var/www/gestor/api;
        index index.php;
        
        location ~ \.php$ {
            include snippets/fastcgi-php.conf;
            fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
            fastcgi_param SCRIPT_FILENAME $request_filename;
        }
    }

    # WhatsApp Proxy
    location /whatsapp {
        rewrite ^/whatsapp/(.*) /$1 break;
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Evolution API (interno, não expor publicamente)
    # Apenas o proxy acessa via localhost:8081
}
```

```bash
# Ativar site
ln -s /etc/nginx/sites-available/gestor /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### 12. Configurar SSL (HTTPS)

```bash
certbot --nginx -d seudominio.com -d www.seudominio.com
```

---

## 🔒 Segurança

### Firewall

```bash
# Instalar UFW
apt install -y ufw

# Configurar regras
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'

# Ativar
ufw enable
```

### Fail2Ban

```bash
apt install -y fail2ban
systemctl enable fail2ban
systemctl start fail2ban
```

---

## 📊 Monitoramento

### Ver logs

```bash
# Next.js
pm2 logs gestor-frontend

# WhatsApp
pm2 logs whatsapp-proxy

# Evolution API
docker logs -f evolution-api

# Nginx
tail -f /var/log/nginx/error.log

# PHP
tail -f /var/log/php8.2-fpm.log
```

### Status dos serviços

```bash
pm2 status
docker ps
systemctl status nginx
systemctl status mysql
```

---

## 🔄 Atualizações

```bash
cd /var/www/gestor
git pull
npm install
npm run build
pm2 restart all
```

---

## 💰 Custo Final

| Item | Custo/mês |
|------|-----------|
| VPS Contabo (4GB) | R$ 22 |
| Domínio | R$ 40/ano (R$ 3,33/mês) |
| **TOTAL** | **R$ 25,33/mês** |

**Para ILIMITADOS revendedores e instâncias WhatsApp!** 🎉

---

## ✅ Checklist de Deploy

- [ ] Servidor contratado
- [ ] Domínio configurado (DNS apontando para IP)
- [ ] Dependências instaladas
- [ ] MySQL configurado
- [ ] Projeto clonado
- [ ] .env configurado
- [ ] Banco importado
- [ ] Evolution API rodando
- [ ] PM2 configurado
- [ ] Nginx configurado
- [ ] SSL instalado
- [ ] Firewall ativo
- [ ] Testes realizados

---

## 🎯 Próximos Passos

1. Contratar VPS
2. Registrar domínio
3. Seguir este guia passo a passo
4. Testar tudo
5. Colocar no ar! 🚀

**Precisa de ajuda em algum passo específico?**
