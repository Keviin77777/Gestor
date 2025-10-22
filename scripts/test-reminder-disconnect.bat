@echo off
echo ========================================
echo Script de Teste - Desconexao WhatsApp
echo ========================================
echo.

echo Este script ajuda a testar a funcionalidade de desconexao/reconexao
echo.

echo [1] Limpando logs de lembretes de hoje...
mysql -u %DB_USER% -p%DB_PASS% -h %DB_HOST% %DB_NAME% < clear-reminder-logs.sql
if %errorlevel% neq 0 (
    echo ❌ Erro ao limpar logs. Verifique as credenciais do banco.
    echo.
    echo Tente executar manualmente:
    echo mysql -u root -p iptv_manager < clear-reminder-logs.sql
    echo.
    pause
    exit /b 1
)

echo ✅ Logs limpos com sucesso!
echo.

echo [2] Verificando status das instancias WhatsApp...
curl -s -H "apikey: gestplay-api-key-2024" http://localhost:3002/instance/fetchInstances
echo.
echo.

echo [3] Instrucoes para teste:
echo.
echo 1. Certifique-se que os processadores estao rodando
echo 2. Identifique uma instancia conectada (ex: reseller_1)
echo 3. 