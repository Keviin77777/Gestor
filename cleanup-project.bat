@echo off
echo Limpando arquivos de teste e documentacao obsoleta...

REM Criar pasta para arquivos obsoletos
if not exist "archive" mkdir archive
if not exist "archive\old-docs" mkdir archive\old-docs
if not exist "archive\old-tests" mkdir archive\old-tests

REM Mover arquivos de teste PHP
move test-*.php archive\old-tests\ 2>nul
move check-*.php archive\old-tests\ 2>nul
move diagnose-*.php archive\old-tests\ 2>nul
move debug-*.php archive\old-tests\ 2>nul
move discover-*.php archive\old-tests\ 2>nul
move fix-*.php archive\old-tests\ 2>nul
move force-*.php archive\old-tests\ 2>nul
move list-*.php archive\old-tests\ 2>nul
move simular-*.sql archive\old-tests\ 2>nul

REM Mover arquivos de teste JS
move test-*.js archive\old-tests\ 2>nul
move monitor-connection.js archive\old-tests\ 2>nul
move reset-instance.js archive\old-tests\ 2>nul
move check-services.js archive\old-tests\ 2>nul

REM Mover scripts PowerShell de teste
move test-*.ps1 archive\old-tests\ 2>nul
move simular-*.ps1 archive\old-tests\ 2>nul

REM Mover documentacao obsoleta
move FIX_*.md archive\old-docs\ 2>nul
move SIGMA_*.md archive\old-docs\ 2>nul
move WHATSAPP_*.md archive\old-docs\ 2>nul
move EVOLUTION_*.md archive\old-docs\ 2>nul
move SUCESSO_*.md archive\old-docs\ 2>nul
move COMO_*.md archive\old-docs\ 2>nul
move INSTALAR_*.md archive\old-docs\ 2>nul
move RESUMO_*.md archive\old-docs\ 2>nul
move REGISTRO_*.md archive\old-docs\ 2>nul
move TROUBLESHOOTING_*.md archive\old-docs\ 2>nul

REM Mover BAT files obsoletos
move start-php-server.bat archive\old-tests\ 2>nul
move start-whatsapp-*.bat archive\old-tests\ 2>nul
move restart-*.bat archive\old-tests\ 2>nul
move force-*.bat archive\old-tests\ 2>nul
move show-*.bat archive\old-tests\ 2>nul
move view-*.bat archive\old-tests\ 2>nul

REM Mover outros arquivos de teste
move test-public-plans.html archive\old-tests\ 2>nul
move add_templates_existing_users.sql archive\old-tests\ 2>nul
move fix-testekevin-userid.sql archive\old-tests\ 2>nul
move composer-setup.php archive\old-tests\ 2>nul
move diagnose-webhook-problem.php archive\old-tests\ 2>nul

echo.
echo Limpeza concluida!
echo Arquivos movidos para a pasta 'archive'
pause
