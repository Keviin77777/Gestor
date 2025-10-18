#!/bin/bash

echo "=========================================="
echo "🔧 CORRIGINDO API PHP EM PRODUÇÃO"
echo "=========================================="
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Diretório do projeto
PROJECT_DIR="/www/wwwroot/ultragestor.site"
API_DIR="$PROJECT_DIR/api"

echo "1️⃣ Verificando estrutura de diretórios..."
if [ ! -d "$API_DIR" ]; then
    echo -e "${RED}❌ Pasta /api não encontrada!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Pasta /api encontrada${NC}"
echo ""

echo "2️⃣ Verificando permissões..."
chown -R www:www "$API_DIR"
chmod -R 755 "$API_DIR"
echo -e "${GREEN}✅ Permissões ajustadas${NC}"
echo ""

echo "3️⃣ Testando PHP..."
php -v
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ PHP não está instalado!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ PHP funcionando${NC}"
echo ""

echo "4️⃣ Criando configuração do Nginx para API..."
cat > /www/server/panel/vhost/nginx/ultragestor.site.conf << 'EOF'
server {
    listen 80;
    listen 443 ssl http2;
    server_name ultragestor.site www.ultragestor.site;
    
    # SSL (aaPanel gerencia automaticamente)
    ssl_certificate /www/server/panel/vhost/cert/ultragestor.site/fullchain.pem;
    ssl_certificate_key /www/server/panel/vhost/cert/ultragestor.site/privkey.pem;
    
    root /www/wwwroot/ultragestor.site;
    index index.html index.php;
    
    # Logs
    access_log /www/wwwlogs/ultragestor.site.log;
    error_log /www/wwwlogs/ultragestor.site.error.log;
    
    # Next.js (porta 3000)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # API PHP
    location /api {
        alias /www/wwwroot/ultragestor.site/api;
        
        # Tentar arquivo, depois index.php
        try_files $uri $uri/ /api/index.php?$query_string;
        
        # Processar PHP
        location ~ \.php$ {
            fastcgi_pass unix:/tmp/php-cgi-74.sock;
            fastcgi_index index.php;
            fastcgi_param SCRIPT_FILENAME $request_filename;
            include fastcgi_params;
        }
    }
    
    # Arquivos estáticos do Next.js
    location /_next/static {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, immutable";
    }
}
EOF

echo -e "${GREEN}✅ Configuração do Nginx criada${NC}"
echo ""

echo "5️⃣ Testando configuração do Nginx..."
nginx -t
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erro na configuração do Nginx!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Configuração válida${NC}"
echo ""

echo "6️⃣ Reiniciando Nginx..."
systemctl restart nginx
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erro ao reiniciar Nginx!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Nginx reiniciado${NC}"
echo ""

echo "7️⃣ Testando API PHP..."
curl -s http://localhost/api/auth.php > /dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ API PHP respondendo localmente${NC}"
else
    echo -e "${YELLOW}⚠️  API pode precisar de ajustes${NC}"
fi
echo ""

echo "=========================================="
echo -e "${GREEN}✅ CONFIGURAÇÃO CONCLUÍDA!${NC}"
echo "=========================================="
echo ""
echo "📝 Próximos passos:"
echo "1. Teste: curl https://ultragestor.site/api/auth.php"
echo "2. Acesse: https://ultragestor.site/login"
echo "3. Se der erro 502, ajuste o socket PHP no Nginx"
echo ""
