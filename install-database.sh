#!/bin/bash

# Script de instalação do banco de dados - GestPlay
# Execute: bash install-database.sh

echo "=========================================="
echo "  Instalação do Banco de Dados GestPlay"
echo "=========================================="
echo ""

# Solicitar credenciais
read -p "Nome do banco de dados: " DB_NAME
read -p "Usuário do banco: " DB_USER
read -sp "Senha do banco: " DB_PASS
echo ""
echo ""

# Verificar se o arquivo existe
if [ ! -f "database/INSTALAR_WORKBENCH.sql" ]; then
    echo "❌ Erro: Arquivo database/INSTALAR_WORKBENCH.sql não encontrado!"
    echo "Certifique-se de estar no diretório raiz do projeto."
    exit 1
fi

echo "📦 Importando schema principal..."
mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < database/INSTALAR_WORKBENCH.sql

if [ $? -eq 0 ]; then
    echo "✅ Schema principal importado com sucesso!"
else
    echo "❌ Erro ao importar schema principal"
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
    echo "  → Executando $migration..."
    mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "database/migrations/$migration"
    
    if [ $? -eq 0 ]; then
        echo "    ✅ OK"
    else
        echo "    ⚠️  Aviso: Pode já estar aplicada"
    fi
done

echo ""
echo "=========================================="
echo "  ✅ Instalação concluída!"
echo "=========================================="
echo ""
echo "Próximos passos:"
echo "1. Configure o arquivo .env"
echo "2. Instale as dependências: npm install && composer install"
echo "3. Faça o build: npm run build"
echo "4. Inicie os serviços com PM2"
echo ""
