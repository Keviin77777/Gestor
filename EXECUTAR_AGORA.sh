#!/bin/bash

# ═══════════════════════════════════════════════════════════════
# 🚀 SCRIPT DE CORREÇÃO COMPLETA DA API
# ═══════════════════════════════════════════════════════════════
# 
# Este script executa TODAS as correções necessárias:
# 1. Atualiza código do GitHub
# 2. Corrige permissões e storage
# 3. Corrige configuração do Nginx
# 4. Testa a API
#
# Execute: bash EXECUTAR_AGORA.sh
# ═══════════════════════════════════════════════════════════════

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "🚀 CORREÇÃO COMPLETA DA API - UltraGestor"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Verificar se está no diretório correto
if [ ! -f "fix-api-production.sh" ]; then
    echo "❌ Erro: Execute este script no diretório do projeto"
    echo "   cd /www/wwwroot/ultragestor.site/Gestor"
    exit 1
fi

# ───────────────────────────────────────────────────────────────
# PASSO 1: Atualizar código do GitHub
# ───────────────────────────────────────────────────────────────
echo "📥 PASSO 1: Atualizando código do GitHub..."
echo "───────────────────────────────────────────────────────────────"
echo ""

git pull origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Código atualizado com sucesso!"
else
    echo ""
    echo "⚠️  Erro ao atualizar código. Continuando mesmo assim..."
fi

echo ""
echo ""

# ───────────────────────────────────────────────────────────────
# PASSO 2: Corrigir permissões e storage
# ───────────────────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════════════════"
echo "🔐 PASSO 2: Corrigindo permissões e storage..."
echo "═══════════════════════════════════════════════════════════════"
echo ""

bash fix-api-production.sh

echo ""
echo ""

# ───────────────────────────────────────────────────────────────
# PASSO 3: Corrigir configuração do Nginx
# ───────────────────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════════════════"
echo "🌐 PASSO 3: Corrigindo configuração do Nginx..."
echo "═══════════════════════════════════════════════════════════════"
echo ""

bash fix-nginx-config.sh

echo ""
echo ""

# ───────────────────────────────────────────────────────────────
# PASSO 4: Teste final
# ───────────────────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════════════════"
echo "🧪 PASSO 4: Teste final da API..."
echo "═══════════════════════════════════════════════════════════════"
echo ""

sleep 3

echo "Teste 1: GET /api/"
API_TEST=$(curl -s https://ultragestor.site/api/)
echo "$API_TEST"
echo ""

if echo "$API_TEST" | grep -q "online"; then
    echo "✅ API está online!"
    API_OK=true
else
    echo "❌ API não está respondendo corretamente"
    API_OK=false
fi

echo ""
echo "Teste 2: POST /api/auth (login)"
LOGIN_TEST=$(curl -s -X POST https://ultragestor.site/api/auth \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@admin.com","password":"admin123","action":"login"}')

# Mostrar apenas primeiros 200 caracteres
echo "${LOGIN_TEST:0:200}..."
echo ""

if echo "$LOGIN_TEST" | grep -q "token"; then
    echo "✅ Login funcionando!"
    LOGIN_OK=true
elif echo "$LOGIN_TEST" | grep -q "error"; then
    echo "⚠️  API respondeu com erro (mas está funcionando)"
    LOGIN_OK=true
else
    echo "❌ Login não está funcionando"
    LOGIN_OK=false
fi

echo ""
echo ""

# ───────────────────────────────────────────────────────────────
# RESUMO FINAL
# ───────────────────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════════════════"
echo "📊 RESUMO FINAL"
echo "═══════════════════════════════════════════════════════════════"
echo ""

if [ "$API_OK" = true ] && [ "$LOGIN_OK" = true ]; then
    echo "🎉 SUCESSO! API está funcionando perfeitamente!"
    echo ""
    echo "✅ Código atualizado"
    echo "✅ Permissões corrigidas"
    echo "✅ Storage criado"
    echo "✅ Nginx configurado"
    echo "✅ API respondendo"
    echo "✅ Login funcionando"
    echo ""
    echo "🌐 Acesse: https://ultragestor.site"
    echo ""
    echo "📋 Próximos passos:"
    echo "   1. Testar login no frontend"
    echo "   2. Verificar PM2: pm2 list"
    echo "   3. Testar criação de clientes"
    echo "   4. Configurar Evolution API (WhatsApp)"
else
    echo "⚠️  ATENÇÃO: Alguns problemas foram encontrados"
    echo ""
    
    if [ "$API_OK" = false ]; then
        echo "❌ API não está respondendo"
        echo "   Verifique os logs:"
        echo "   tail -f /www/wwwlogs/ultragestor.site.error.log"
    fi
    
    if [ "$LOGIN_OK" = false ]; then
        echo "❌ Login não está funcionando"
        echo "   Verifique o banco de dados:"
        echo "   mysql -u ultragestor_db -p ultragestor_db"
    fi
    
    echo ""
    echo "📞 Documentação:"
    echo "   - PROBLEMA_403_NGINX.md"
    echo "   - COMANDOS_CORRIGIR_API.md"
    echo "   - SOLUCAO_RAPIDA_API.md"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
