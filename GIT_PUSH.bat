@echo off
echo ==========================================
echo 🚀 ENVIANDO PARA GITHUB
echo ==========================================
echo.

echo 1️⃣ Adicionando arquivos...
git add .

echo.
echo 2️⃣ Criando commit...
git commit -m "fix: Corrigir admin dashboard e templates padrão + Nginx API funcionando"

echo.
echo 3️⃣ Enviando para GitHub...
git push origin main

echo.
echo ==========================================
echo ✅ ENVIADO COM SUCESSO!
echo ==========================================
echo.
echo 📝 Próximos passos na VPS:
echo.
echo cd /www/wwwroot/ultragestor.site/Gestor
echo git pull origin main
echo chmod +x CORRIGIR_ADMIN_TEMPLATES.sh
echo ./CORRIGIR_ADMIN_TEMPLATES.sh
echo.
pause
