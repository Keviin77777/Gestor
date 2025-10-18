@echo off
echo ========================================
echo INSTALAR EVOLUTION API (GRATIS!)
echo ========================================
echo.

echo Verificando Docker...
docker --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo ❌ Docker nao encontrado!
    echo.
    echo Por favor, instale o Docker Desktop:
    echo https://www.docker.com/products/docker-desktop
    echo.
    echo Apos instalar, reinicie o PC e execute este script novamente.
    echo.
    pause
    exit /b 1
)

echo ✅ Docker encontrado!
echo.

echo Parando containers antigos...
docker-compose -f docker-compose-evolution.yml down 2>nul

echo.
echo Baixando Evolution API...
docker-compose -f docker-compose-evolution.yml pull

echo.
echo Iniciando Evolution API...
docker-compose -f docker-compose-evolution.yml up -d

echo.
echo Aguardando Evolution API iniciar...
timeout /t 5 /nobreak >nul

echo.
echo Testando conexao...
curl -s http://localhost:8080 >nul 2>&1
if errorlevel 1 (
    echo ⚠️ Evolution API ainda nao esta pronta.
    echo Aguarde mais alguns segundos e teste: http://localhost:8080
) else (
    echo ✅ Evolution API esta rodando!
)

echo.
echo ========================================
echo INSTALACAO CONCLUIDA!
echo ========================================
echo.
echo 📡 Evolution API: http://localhost:8080
echo 🔑 API Key: gestplay-whatsapp-2024
echo.
echo Proximos passos:
echo 1. Iniciar servidor proxy: node scripts/whatsapp-evolution-server.js
echo 2. Testar no gestor
echo.
echo Comandos uteis:
echo - Ver logs: docker logs -f evolution-api
echo - Parar: docker-compose -f docker-compose-evolution.yml down
echo - Reiniciar: docker-compose -f docker-compose-evolution.yml restart
echo.
pause
