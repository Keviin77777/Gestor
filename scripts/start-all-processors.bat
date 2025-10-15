@echo off
echo ========================================
echo Iniciando Todos os Processadores
echo ========================================
echo.

cd /d "%~dp0"

echo [1/4] Iniciando WhatsApp Server...
start "WhatsApp Server" cmd /k "node whatsapp-server.js"
timeout /t 2 /nobreak >nul

echo [2/5] Iniciando Processador de Lembretes...
start "Reminder Processor" cmd /k "node reminder-processor.js"
timeout /t 2 /nobreak >nul

echo [3/6] Iniciando Monitor de Conexao WhatsApp...
start "WhatsApp Connection Monitor" cmd /k "node whatsapp-connection-monitor.js"
timeout /t 2 /nobreak >nul

echo [4/6] Iniciando Processador de Faturas...
start "Invoice Processor" cmd /k "node invoice-processor.js"
timeout /t 2 /nobreak >nul

echo [5/7] Iniciando Processador de Assinaturas...
start "Subscription Processor" cmd /k "node subscription-processor.js"
timeout /t 2 /nobreak >nul

echo [6/7] Iniciando Processador de WhatsApp para Revendedores...
start "Reseller WhatsApp Processor" cmd /k "node reseller-whatsapp-processor.js"
timeout /t 2 /nobreak >nul

echo [7/7] Verificando servicos...
timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo Todos os processadores foram iniciados!
echo ========================================
echo.
echo Servicos rodando:
echo   - WhatsApp Server: http://localhost:3002
echo   - Reminder Processor: http://localhost:3003/health
echo   - WhatsApp Connection Monitor: Monitorando conexoes
echo   - Invoice Processor: http://localhost:3004/health
echo   - Subscription Processor: http://localhost:3005/health
echo   - Reseller WhatsApp Processor: http://localhost:3006/health
echo.
echo O Invoice Processor verifica clientes a cada 1 hora
echo e gera faturas automaticamente para vencimentos em ate 10 dias
echo.
echo O Reseller WhatsApp Processor envia mensagens automaticas
echo para revendedores com assinaturas expirando (7, 3, 1 dias e vencidas)
echo.
echo Pressione qualquer tecla para fechar esta janela...
pause >nul
