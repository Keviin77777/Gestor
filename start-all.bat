@echo off
echo 🚀 Iniciando todos os serviços...
echo.

echo 📋 Verificando serviços...
node check-services.js
echo.

echo ⚠️  IMPORTANTE:
echo   1. Certifique-se de que Next.js está rodando: npm run dev
echo   2. Certifique-se de que PHP está rodando: php -S localhost:8080 -t api
echo   3. Depois execute: node proxy-server.js
echo   4. Configure ngrok: ngrok http 9000
echo.

pause
echo.
echo 🔄 Iniciando proxy...
node proxy-server.js