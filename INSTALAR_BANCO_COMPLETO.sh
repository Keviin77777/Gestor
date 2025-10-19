#!/bin/bash

# ============================================================================
# Script de Instalação Completa do Banco de Dados
# UltraGestor - Versão 3.0
# ============================================================================

echo "🚀 Iniciando instalação completa do banco de dados..."
echo ""

# Configurações
DB_NAME="ultragestor_db"
DB_USER="ultragestor_db"
DB_PASS="b0d253f4e062ee"

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📋 Configurações:${NC}"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"
echo ""

# Verificar se o arquivo SQL existe
if [ ! -f "database/INSTALAR_COMPLETO_ATUALIZADO.sql" ]; then
    echo -e "${RED}❌ Erro: Arquivo database/INSTALAR_COMPLETO_ATUALIZADO.sql não encontrado!${NC}"
    exit 1
fi

echo -e "${YELLOW}🔄 Executando SQL de instalação...${NC}"
echo ""

# Executar o SQL
mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < database/INSTALAR_COMPLETO_ATUALIZADO.sql

# Verificar se deu certo
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Banco de dados instalado com sucesso!${NC}"
    echo ""
    
    # Verificar tabelas criadas
    echo -e "${YELLOW}📊 Verificando tabelas criadas:${NC}"
    mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "SHOW TABLES;"
    
    echo ""
    echo -e "${GREEN}🎉 Instalação concluída!${NC}"
    echo ""
    echo -e "${YELLOW}📝 Próximos passos:${NC}"
    echo "   1. Testar o registro de novo usuário"
    echo "   2. Fazer login com: admin@admin.com / admin123"
    echo "   3. Alterar a senha do admin"
    echo ""
else
    echo ""
    echo -e "${RED}❌ Erro ao instalar o banco de dados!${NC}"
    echo -e "${YELLOW}💡 Verifique os logs acima para mais detalhes${NC}"
    exit 1
fi
