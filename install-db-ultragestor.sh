#!/bin/bash

# Script de instalação do banco de dados - UltraGestor
# Execute: bash install-db-ultragestor.sh

echo "=========================================="
echo "  Instalação do Banco - UltraGestor"
echo "=========================================="
echo ""

# Configurações
DB_NAME="ultragestor_db"
DB_USER="ultragestor_db"

# Solicitar senha
read -sp "Digite a senha do banco de dados: " DB_PASS
echo ""
echo ""

# Testar conexão
echo "🔍 Testando conexão com o banco..."
mysql -u "$DB_USER" -p"$DB_PASS" -e "SELECT 1;" 2>/dev/null

if [ $? -ne 0 ]; then
    echo "❌ Erro: Não foi possível conectar ao banco de dados!"
    echo ""
    echo "Verifique:"
    echo "1. A senha está correta?"
    echo "2. O usuário '$DB_USER' existe?"
    echo "3. O usuário tem permissões no banco '$DB_NAME'?"
    echo ""
    echo "Para verificar no aaPanel:"
    echo "  aaPanel → Database → ultragestor_db → Ver senha"
    exit 1
fi

echo "✅ Conexão OK!"
echo ""

# Criar diretório temporário
TMP_DIR="/tmp/ultragestor_install_$$"
mkdir -p "$TMP_DIR"

echo "📦 Preparando arquivos SQL..."

# Corrigir o INSTALAR_WORKBENCH.sql
sed "s/USE iptv_manager;/USE $DB_NAME;/g" database/INSTALAR_WORKBENCH.sql > "$TMP_DIR/schema.sql"

echo "📦 Importando schema principal..."
mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$TMP_DIR/schema.sql"

if [ $? -eq 0 ]; then
    echo "✅ Schema principal importado!"
else
    echo "❌ Erro ao importar schema principal"
    rm -rf "$TMP_DIR"
    exit 1
fi

echo ""
echo "📦 Executando migrations..."
echo ""

# Array de migrations em ordem
migrations=(
    "001_create_whatsapp_reminder_tables.sql"
    "002_add_template_scheduling.sql"
    "003_unified_templates_system.sql"
    "004_payment_methods.sql"
    "005_update_whatsapp_templates_payment_link.sql"
    "006_reseller_subscriptions.sql"
    "007_admin_and_reseller_whatsapp.sql"
    "008_default_client_templates.sql"
    "009_admin_payment_methods.sql"
    "010_trial_system.sql"
    "011_add_whatsapp_to_resellers.sql"
    "012_password_reset_tokens.sql"
)

# Executar cada migration
for migration in "${migrations[@]}"; do
    if [ -f "database/migrations/$migration" ]; then
        echo "  → $migration"
        mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "database/migrations/$migration" 2>&1 | grep -v "Duplicate"
        
        if [ ${PIPESTATUS[0]} -eq 0 ]; then
            echo "    ✅ OK"
        else
            echo "    ⚠️  Aviso: Pode já estar aplicada"
        fi
    else
        echo "  ⚠️  Arquivo não encontrado: $migration"
    fi
done

# Limpar arquivos temporários
rm -rf "$TMP_DIR"

echo ""
echo "=========================================="
echo "  ✅ Instalação concluída!"
echo "=========================================="
echo ""
echo "📊 Verificando instalação..."
mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "SHOW TABLES;" | head -20

echo ""
echo "🔐 Credenciais padrão do sistema:"
echo "   Email: admin@admin.com"
echo "   Senha: admin123"
echo ""
echo "⚠️  IMPORTANTE: Altere a senha após o primeiro login!"
echo ""
echo "📝 Próximos passos:"
echo "1. Configure o arquivo .env"
echo "2. Instale dependências: npm install && composer install"
echo "3. Build do frontend: npm run build"
echo "4. Configure PM2 e Nginx"
echo ""
