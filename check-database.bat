@echo off
echo ============================================
echo DIAGNOSTICO DO BANCO DE DADOS
echo ============================================
echo.

REM Carregar variáveis do .env
for /f "tokens=1,2 delims==" %%a in (.env) do (
    if "%%a"=="DB_HOST" set DB_HOST=%%b
    if "%%a"=="DB_USER" set DB_USER=%%b
    if "%%a"=="DB_PASSWORD" set DB_PASSWORD=%%b
    if "%%a"=="DB_NAME" set DB_NAME=%%b
)

echo Conectando ao banco: %DB_NAME%
echo Host: %DB_HOST%
echo Usuario: %DB_USER%
echo.
echo Executando diagnostico...
echo.

REM Executar diagnóstico
mysql -h %DB_HOST% -u %DB_USER% -p%DB_PASSWORD% %DB_NAME% < database\check-database.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ============================================
    echo ✅ DIAGNOSTICO CONCLUIDO
    echo ============================================
    echo.
    echo Verifique os resultados acima.
    echo.
    echo Se a coluna 'whatsapp' NAO EXISTE:
    echo   Execute: run-migrations.bat
    echo.
) else (
    echo.
    echo ============================================
    echo ❌ ERRO AO EXECUTAR DIAGNOSTICO
    echo ============================================
    echo.
    echo Verifique:
    echo 1. Se o MySQL esta rodando
    echo 2. Se as credenciais no .env estao corretas
    echo 3. Se o banco de dados existe
    echo.
)

pause
