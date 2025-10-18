@echo off
echo 🚀 Iniciando Servidor Proxy...
echo.
echo Este proxy roteia:
echo   /api/* para PHP (porta 8080)
echo   /checkout/* para Next.js (porta 3000)
echo   /* para Next.js (porta 3000)
echo.
echo Certifique-se de que:
echo   ✅ Next.js está rodando na porta 3000
echo   ✅ PHP está rodando na porta 8080
echo.
pause
node proxy-server.js