# 🔧 CORRIGIR ERRO 403 DA API PHP

## Problema
A API PHP está retornando 403 Forbidden porque o Nginx não está configurado corretamente para processar PHP.

## Solução Rápida

### 1. Verificar configuração do Nginx no aaPanel

```bash
# Ver configuração atual do site
cat /www/server/panel/vhost/nginx/ultragestor.site.conf
```

### 2. Editar configuração do Nginx

No **aaPanel**, vá em:
- **Website** → **ultragestor.site** → **Settings** → **Config File**

Ou edite diretamente:
```bash
nano /www/server/panel/vhost/nginx/ultragestor.site.conf
```

### 3. Configuração correta do Nginx

Substitua o conteúdo por:

```nginx
server {
    listen 80;
    listen 443 ssl http2;
    server_name ultragestor.site www.ultragestor.site;
    
    # SSL Configuration (se tiver certificado)
    # ssl_certificate /www/server/panel/vhost/cert/ultragestor.site/fullchain.pem;
    # ssl_certificate_key /www/server/panel/vhost/cert/ultragestor.site/privkey.pem;
    
    root /www/wwwroot/ultragestor.site/Gestor;
    index index.php index.html;
    
    # Logs
    access_log /www/wwwlogs/ultragestor.site.log;
    error_log /www/wwwlogs/ultragestor.site.error.log;
    
    # Frontend Next.js (proxy para porta 3000)
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
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # API PHP
    location /api {
        alias /www/wwwroot/ultragestor.site/Gestor/api;
        
        # Processar index.php para todas as requisições da API
        location ~ ^/api(/.*)?$ {
            fastcgi_pass unix:/tmp/php-cgi-74.sock;
            fastcgi_index index.php;
            fastcgi_param SCRIPT_FILENAME /www/wwwroot/ultragestor.site/Gestor/api/index.php;
            fastcgi_param REQUEST_URI $1;
            include fastcgi_params;
            
            # Headers CORS
            add_header 'Access-Control-Allow-Origin' 'https://ultragestor.site' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type' always;
            add_header 'Access-Control-Allow-Credentials' 'true' always;
            
            if ($request_method = 'OPTIONS') {
                return 204;
            }
        }
    }
    
    # Arquivos estáticos
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 4. Testar e recarregar Nginx

```bash
# Testar configuração
nginx -t

# Se OK, recarregar
nginx -s reload
```

## Restaurar .env Completo

O arquivo .env foi sobrescrito. Adicione as variáveis que faltam:

```bash
cd /www/wwwroot/ultragestor.site/Gestor
nano .env
```

Adicione no final do arquivo:

```env
# API PHP Configuration
API_URL=https://ultragestor.site/api
PHP_API_URL=https://ultragestor.site/api

# Sigma Panel Integration
SIGMA_API_URL=http://seu-painel-sigma.com
SIGMA_API_KEY=sua-chave-api-sigma
SIGMA_API_SECRET=seu-secret-sigma

# Payment Gateway - Mercado Pago
MERCADOPAGO_ACCESS_TOKEN=seu-token-mercadopago
MERCADOPAGO_PUBLIC_KEY=sua-public-key-mercadopago

# Payment Gateway - Asaas
ASAAS_API_KEY=sua-chave-asaas
ASAAS_WALLET_ID=seu-wallet-id-asaas

# PIX Configuration
PIX_KEY=sua-chave-pix
PIX_KEY_TYPE=email
PIX_MERCHANT_NAME=UltraGestor
PIX_MERCHANT_CITY=Sao Paulo
```

## Verificar Permissões

```bash
# Permissões corretas para a API
cd /www/wwwroot/ultragestor.site/Gestor
chown -R www:www api/
chmod -R 755 api/
chmod 644 api/*.php
chmod 644 api/resources/*.php
chmod 644 api/lib/*.php

# Verificar se o .env está acessível
chmod 644 .env
chown www:www .env
```

## Testar API

```bash
# Teste 1: Verificar se a API está respondendo
curl https://ultragestor.site/api/

# Deve retornar: {"message":"IPTV Manager API v1.0","status":"online"}

# Teste 2: Login
curl -X POST https://ultragestor.site/api/auth \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@admin.com","password":"admin123","action":"login"}'

# Deve retornar um token JWT
```

## Verificar Logs de Erro

```bash
# Ver erros do Nginx
tail -f /www/wwwlogs/ultragestor.site.error.log

# Ver erros do PHP
tail -f /www/server/php/74/var/log/php-fpm.log
```

## Checklist Final

- [ ] Nginx configurado com proxy para Next.js na porta 3000
- [ ] Nginx configurado para processar PHP na rota /api
- [ ] Arquivo .env restaurado com todas as variáveis
- [ ] Permissões corretas (www:www e 755/644)
- [ ] Nginx testado e recarregado
- [ ] API respondendo corretamente
- [ ] Login funcionando

## Comandos Rápidos

```bash
# Ver status dos serviços
systemctl status nginx
systemctl status php-fpm-74

# Reiniciar serviços se necessário
systemctl restart nginx
systemctl restart php-fpm-74

# Ver processos Node.js
pm2 list

# Ver logs do Next.js
pm2 logs ultragestor-frontend
```

## Notas Importantes

1. **Versão do PHP**: Certifique-se de usar PHP 7.4 ou superior
2. **Socket do PHP-FPM**: O caminho `/tmp/php-cgi-74.sock` pode variar. Verifique em:
   ```bash
   ls -la /tmp/php-cgi*.sock
   ```
3. **SSL**: Se tiver certificado SSL, descomente as linhas de SSL na configuração
4. **Firewall**: Certifique-se que as portas 80 e 443 estão abertas

## Próximos Passos

Após corrigir a API:
1. Testar login no frontend
2. Verificar se os processadores Node.js estão funcionando
3. Testar criação de clientes
4. Testar geração de faturas
5. Testar integração com WhatsApp
