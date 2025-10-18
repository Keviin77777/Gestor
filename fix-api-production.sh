#!/bin/bash

# Script para corrigir API em produção
# Execute: bash fix-api-production.sh

echo "🔧 Corrigindo API PHP em produção..."
echo ""

# Diretório do projeto
PROJECT_DIR="/www/wwwroot/ultragestor.site/Gestor"
cd $PROJECT_DIR

# 1. Criar pasta storage com permissões corretas
echo "📁 Criando pasta storage..."
mkdir -p storage
chown -R www:www storage
chmod -R 755 storage
echo "✅ Pasta storage criada"
echo ""

# 2. Corrigir permissões da API
echo "🔐 Corrigindo permissões..."
chown -R www:www api/
chmod -R 755 api/
find api/ -type f -name "*.php" -exec chmod 644 {} \;
echo "✅ Permissões da API corrigidas"
echo ""

# 3. Corrigir permissões do .env
chmod 644 .env
chown www:www .env
echo "✅ Permissões do .env corrigidas"
echo ""

# 4. Verificar versão do PHP
echo "🐘 Verificando PHP..."
PHP_VERSION=$(php -v | head -n 1)
echo "$PHP_VERSION"
echo ""

# 5. Verificar se putenv está habilitado
echo "⚙️ Verificando funções PHP..."
PUTENV_STATUS=$(php -r "echo function_exists('putenv') ? 'enabled' : 'disabled';")
if [ "$PUTENV_STATUS" = "enabled" ]; then
    echo "✅ putenv() está habilitado"
else
    echo "❌ putenv() está DESABILITADO"
    echo ""
    echo "⚠️  AÇÃO NECESSÁRIA:"
    echo "   1. Acesse o aaPanel"
    echo "   2. Vá em Software → PHP 8.1 → Settings"
    echo "   3. Aba 'Disabled Functions'"
    echo "   4. Remova 'putenv' da lista"
    echo "   5. Clique em Save"
    echo "   6. Execute: systemctl restart php-fpm-81"
    echo ""
fi
echo ""

# 6. Testar se .env está acessível
echo "📄 Verificando .env..."
if [ -f .env ]; then
    echo "✅ .env existe"
    LINE_COUNT=$(wc -l < .env)
    echo "   Linhas: $LINE_COUNT"
    
    # Verificar variáveis importantes
    if grep -q "JWT_SECRET=" .env; then
        echo "   ✅ JWT_SECRET definido"
    else
        echo "   ❌ JWT_SECRET não encontrado"
    fi
    
    if grep -q "DB_HOST=" .env; then
        echo "   ✅ DB_HOST definido"
    else
        echo "   ❌ DB_HOST não encontrado"
    fi
else
    echo "❌ .env não encontrado!"
fi
echo ""

# 7. Criar arquivo de teste da API
echo "🧪 Criando arquivo de teste..."
cat > api/test-env.php << 'EOF'
<?php
require_once __DIR__ . '/security.php';

echo "=== TESTE DE AMBIENTE ===\n\n";

// Testar função env()
echo "📋 Variáveis de ambiente:\n";
echo "- DB_HOST: " . env('DB_HOST', 'não definido') . "\n";
echo "- DB_NAME: " . env('DB_NAME', 'não definido') . "\n";
echo "- JWT_SECRET: " . (env('JWT_SECRET') ? 'definido (' . strlen(env('JWT_SECRET')) . ' chars)' : 'não definido') . "\n";
echo "- ENCRYPTION_KEY: " . (env('ENCRYPTION_KEY') ? 'definido (' . strlen(env('ENCRYPTION_KEY')) . ' chars)' : 'não definido') . "\n";
echo "- API_URL: " . env('API_URL', 'não definido') . "\n";
echo "- FRONTEND_URL: " . env('FRONTEND_URL', 'não definido') . "\n";

echo "\n=== TESTE DE STORAGE ===\n";
$storage_dir = __DIR__ . '/../storage';
if (is_dir($storage_dir)) {
    echo "✅ Pasta storage existe\n";
    if (is_writable($storage_dir)) {
        echo "✅ Pasta storage tem permissão de escrita\n";
        
        // Testar gravação
        $test_file = $storage_dir . '/test.txt';
        if (file_put_contents($test_file, 'test')) {
            echo "✅ Teste de gravação OK\n";
            unlink($test_file);
        } else {
            echo "❌ Erro ao gravar arquivo de teste\n";
        }
    } else {
        echo "❌ Pasta storage SEM permissão de escrita\n";
    }
} else {
    echo "❌ Pasta storage não existe\n";
}

echo "\n=== TESTE DE FUNÇÕES PHP ===\n";
echo "- putenv: " . (function_exists('putenv') ? '✅ habilitado' : '❌ desabilitado') . "\n";
echo "- getenv: " . (function_exists('getenv') ? '✅ habilitado' : '❌ desabilitado') . "\n";
echo "- file_put_contents: " . (function_exists('file_put_contents') ? '✅ habilitado' : '❌ desabilitado') . "\n";

echo "\n=== INFORMAÇÕES DO PHP ===\n";
echo "- Versão: " . PHP_VERSION . "\n";
$disabled = ini_get('disable_functions');
if (empty($disabled)) {
    echo "- Funções desabilitadas: nenhuma\n";
} else {
    echo "- Funções desabilitadas: " . substr($disabled, 0, 100) . "...\n";
}

echo "\n✅ Teste concluído!\n";
EOF

chmod 644 api/test-env.php
echo "✅ Arquivo de teste criado: api/test-env.php"
echo ""

# 8. Executar teste
echo "🧪 Executando teste..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
php api/test-env.php
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 9. Testar API via HTTP
echo "🌐 Testando API via HTTP..."
API_RESPONSE=$(curl -s https://ultragestor.site/api/)
if echo "$API_RESPONSE" | grep -q "online"; then
    echo "✅ API está respondendo!"
    echo "   Resposta: $API_RESPONSE"
else
    echo "❌ API não está respondendo corretamente"
    echo "   Resposta: $API_RESPONSE"
fi
echo ""

# 10. Resumo final
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RESUMO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Correções aplicadas:"
echo "   • Pasta storage criada"
echo "   • Permissões corrigidas"
echo "   • Arquivo de teste criado"
echo ""

if [ "$PUTENV_STATUS" = "disabled" ]; then
    echo "⚠️  AÇÃO NECESSÁRIA:"
    echo "   Habilite putenv() no PHP (ver instruções acima)"
    echo ""
fi

echo "📋 Próximos comandos:"
echo ""
echo "# Testar login:"
echo "curl -X POST https://ultragestor.site/api/auth \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"email\":\"admin@admin.com\",\"password\":\"admin123\",\"action\":\"login\"}'"
echo ""
echo "# Ver logs de erro:"
echo "tail -f /www/wwwlogs/ultragestor.site.error.log"
echo ""
echo "# Reiniciar PHP-FPM (se necessário):"
echo "systemctl restart php-fpm-81"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
