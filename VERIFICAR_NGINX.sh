#!/bin/bash

echo "=========================================="
echo "🔍 DIAGNÓSTICO DO NGINX"
echo "=========================================="
echo ""

echo "1️⃣ Testando configuração do Nginx..."
nginx -t
echo ""

echo "2️⃣ Status do serviço Nginx..."
systemctl status nginx.service --no-pager
echo ""

echo "3️⃣ Últimos logs de erro do Nginx..."
journalctl -xeu nginx.service --no-pager -n 50
echo ""

echo "4️⃣ Verificando portas em uso..."
netstat -tlnp | grep -E ':(80|443|3000)'
echo ""

echo "=========================================="
echo "✅ DIAGNÓSTICO COMPLETO"
echo "=========================================="
echo ""
echo "📝 NOTA: O site está funcionando via Cloudflare → Next.js"
echo "O Nginx é opcional neste momento."
