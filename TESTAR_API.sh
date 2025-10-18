#!/bin/bash

echo "=========================================="
echo "🧪 TESTANDO API PHP"
echo "=========================================="
echo ""

echo "1️⃣ Testando auth.php local..."
curl -s http://localhost/api/auth.php | head -20
echo ""
echo ""

echo "2️⃣ Testando auth.php via domínio..."
curl -s https://ultragestor.site/api/auth.php | head -20
echo ""
echo ""

echo "3️⃣ Testando public-plans..."
curl -s https://ultragestor.site/api/public-plans | head -20
echo ""
echo ""

echo "4️⃣ Verificando socket PHP..."
ls -la /tmp/php-cgi*.sock
echo ""

echo "5️⃣ Verificando processos PHP-FPM..."
ps aux | grep php-fpm | grep -v grep
echo ""

echo "=========================================="
echo "✅ TESTES CONCLUÍDOS"
echo "=========================================="
