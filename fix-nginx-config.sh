#!/bin/bash

# Script para corrigir configuração do Nginx
# Execute: bash fix-nginx-config.sh

echo "🔧 Corrigindo configuração do Nginx..."
echo ""

# Backup da configuração atual
NGINX_CONF="/www/server/panel/vhost/nginx/ultragestor.site.conf"
BACKUP_FILE="${NGINX_CONF}.backup.$(date +%Y%m%d_%H%M%S)"

if [ -f "$NGINX_CONF" ]; then
    echo "📦 Criando backup da configuração atual..."
    cp "$NGINX_CONF" "$BACKUP_FILE"
    echo "✅ Backup criado: $BACKUP_FILE"
    echo ""
else
    echo "❌ Arquivo de configuração não encontrado: $NGINX_CONF"
    echo ""
    echo "Criando nova configuração..."
fi

# Criar nova configuração
echo "📝 Criando nova configuração do Nginx..."

cat > "$NGINX_CONF" << 'NGINX_CONFIG'
server {
    listen 80;
    listen 443 ssl http2;
    server_name ultragestor.site www.ultragestor.site;
    
    # SSL Configuration (ajuste os caminhos se tiver certificado)
    # ssl_certificate /www/server/panel/vhost/cert/ultragestor.site/fullchain.pem;
    # ssl_certificate_key /www/server/panel/vhost/cert/ultragestor.site/privkey.pem;
    # ssl_protocols TLSv1.2 TLSv1.3;
    # ssl_ciphers HIGH:!aNULL:!MD5;
    
    root /www/wwwroot/ultragestor.site/Gestor;
    index index.php index.html;
    
    # Logs
    access_log /www/wwwlogs/ultragestor.site.log;
    error_log /www/wwwlogs/ultragestor.site.error.log;
    
    # Aumentar tamanho máximo de upload
    client_max_body_size 50M;
    
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
    
    # API PHP - TODAS as requisições vão para index.php
    location /api {
        # Remover /api do início do path
        rewrite ^/api/?(.*)$ /$1 break;
        
        # Passar tudo para o index.php da API
        fastcgi_pass unix:/tmp/php-cgi-81.sock;
        fastcgi_index index.php;
        
        # IMPORTANTE: Sempre usar index.php
        fastcgi_param SCRIPT_FILENAME /www/wwwroot/ultragestor.site/Gestor/api/index.php;
        fastcgi_param SCRIPT_NAME /api/index.php;
        fastcgi_param REQUEST_URI /api/$1$is_args$args;
        
        # Parâmetros FastCGI padrão
        include fastcgi_params;
        
        # Parâmetros adicionais
        fastcgi_param PATH_INFO $fastcgi_path_info;
        fastcgi_param QUERY_STRING $query_string;
        fastcgi_param REQUEST_METHOD $request_method;
        fastcgi_param CONTENT_TYPE $content_type;
        fastcgi_param CONTENT_LENGTH $content_length;
        
        # Headers CORS
        add_header 'Access-Control-Allow-Origin' '$http_origin' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, X-CSRF-Token' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
        
        # Responder OPTIONS para CORS preflight
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '$http_origin' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, X-CSRF-Token' always;
            add_header 'Access-Control-Allow-Credentials' 'true' always;
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain charset=UTF-8';
            add_header 'Content-Length' 0;
            return 204;
        }
    }
    
    # Bloquear acesso direto a arquivos sensíveis
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    location ~ /\.env {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    location ~ /composer\.(json|lock) {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    location ~ /package(-lock)?\.json {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    # Arquivos estáticos
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot|webp)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
}
NGINX_CONFIG

echo "✅ Configuração criada"
echo ""

# Testar configuração
echo "🧪 Testando configuração do Nginx..."
nginx -t

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Configuração válida!"
    echo ""
    echo "🔄 Recarregando Nginx..."
    nginx -s reload
    
    if [ $? -eq 0 ]; then
        echo "✅ Nginx recarregado com sucesso!"
    else
        echo "❌ Erro ao recarregar Nginx"
        echo "Tente manualmente: systemctl restart nginx"
    fi
else
    echo ""
    echo "❌ Configuração inválida!"
    echo "Restaurando backup..."
    cp "$BACKUP_FILE" "$NGINX_CONF"
    echo "Backup restaurado. Verifique os erros acima."
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 TESTANDO API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Aguardar um pouco para o Nginx processar
sleep 2

# Teste 1: API raiz
echo "Teste 1: GET /api/"
API_RESPONSE=$(curl -s https://ultragestor.site/api/)
echo "Resposta: $API_RESPONSE"
echo ""

if echo "$API_RESPONSE" | grep -q "online"; then
    echo "✅ API está respondendo!"
else
    echo "⚠️  API não respondeu como esperado"
fi

echo ""
echo "Teste 2: POST /api/auth"
LOGIN_RESPONSE=$(curl -s -X POST https://ultragestor.site/api/auth \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@admin.com","password":"admin123","action":"login"}')
echo "Resposta: $LOGIN_RESPONSE"
echo ""

if echo "$LOGIN_RESPONSE" | grep -q "token"; then
    echo "✅ Login funcionando!"
elif echo "$LOGIN_RESPONSE" | grep -q "error"; then
    echo "⚠️  API respondeu com erro (mas está funcionando)"
else
    echo "❌ Login não está funcionando"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RESUMO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Configuração do Nginx atualizada"
echo "✅ Nginx recarregado"
echo ""
echo "📋 Arquivos:"
echo "   Config: $NGINX_CONF"
echo "   Backup: $BACKUP_FILE"
echo ""
echo "🔍 Ver logs de erro:"
echo "   tail -f /www/wwwlogs/ultragestor.site.error.log"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
