@echo off
echo ========================================
echo Iniciando Todos os Processadores
echo ========================================
echo.

cd /d "%~dp0"

echo [1/4] Iniciando WhatsApp Server...
start "WhatsApp Server" cmd /k "node whatsapp-server.js"
timeout /t 2 /nobreak >nul

echo [2/4] Iniciando Processador de Lembretes...
start "Reminder Processor" cmd /k "node reminder-processor.js"
timeout /t 2 /nobreak >nul

echo [3/4] Iniciando Processador de Faturas...
start "Invoice Processor" cmd /k "node invoice-processor.js"
timeout /t 2 /nobreak >nul

echo [4/4] Verificando servicos...
timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo Todos os processadores foram iniciados!
echo ========================================
echo.
echo Servicos rodando:
echo   - WhatsApp Server: http://localhost:3002
echo   - Reminder Processor: http://localhost:3003/health
echo   - Invoice Processor: http://localhost:3004/health
echo.
echo O Invoice Processor verifica clientes a cada 1 hora
echo e gera faturas automaticamente para vencimentos em ate 10 dias
echo.
echo Pressione qualquer tecla para fechar esta janela...
pause >nul
