@echo off
echo ============================================
echo EXECUTANDO MIGRATIONS DO BANCO DE DADOS
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

REM Executar migrations
mysql -h %DB_HOST% -u %DB_USER% -p%DB_PASSWORD% %DB_NAME% < database\run-migrations.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ============================================
    echo ✅ MIGRATIONS EXECUTADAS COM SUCESSO!
    echo ============================================
    echo.
    echo A coluna 'whatsapp' foi adicionada na tabela resellers.
    echo Agora voce pode fazer o registro normalmente.
    echo.
) else (
    echo.
    echo ============================================
    echo ❌ ERRO AO EXECUTAR MIGRATIONS
    echo ============================================
    echo.
    echo Verifique:
    echo 1. Se o MySQL esta rodando
    echo 2. Se as credenciais no .env estao corretas
    echo 3. Se o banco de dados existe
    echo.
)

pause
