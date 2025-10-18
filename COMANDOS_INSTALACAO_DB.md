# 📦 Comandos para Instalação do Banco de Dados

## Opção 1: Script Automático (Recomendado)

```bash
# Dar permissão de execução
chmod +x install-database.sh

# Executar
bash install-database.sh
```

---

## Opção 2: Comandos Manuais

### 1. Verificar se está no diretório correto

```bash
# Deve estar em /www/wwwroot/ultragestor.site
pwd

# Listar arquivos para confirmar
ls -la database/
```

### 2. Importar Schema Principal

```bash
mysql -u ultragestor_db -p ultragestor_db < database/INSTALAR_WORKBENCH.sql
```

**Se der erro "No such file":**
```bash
# Verificar caminho completo
ls -la /www/wwwroot/ultragestor.site/database/INSTALAR_WORKBENCH.sql

# Usar caminho absoluto
mysql -u ultragestor_db -p ultragestor_db < /www/wwwroot/ultragestor.site/database/INSTALAR_WORKBENCH.sql
```

### 3. Executar Migrations (em ordem)

```bash
# Migration 001
mysql -u ultragestor_db -p ultragestor_db < database/migrations/001_create_whatsapp_reminder_tables.sql

# Migration 002
mysql -u ultragestor_db -p ultragestor_db < database/migrations/002_add_template_scheduling.sql

# Migration 003
mysql -u ultragestor_db -p ultragestor_db < database/migrations/003_unified_templates_system.sql

# Migration 004
mysql -u ultragestor_db -p ultragestor_db < database/migrations/004_payment_methods.sql

# Migration 005
mysql -u ultragestor_db -p ultragestor_db < database/migrations/005_update_whatsapp_templates_payment_link.sql

# Migration 006
mysql -u ultragestor_db -p ultragestor_db < database/migrations/006_reseller_subscriptions.sql

# Migration 007
mysql -u ultragestor_db -p ultragestor_db < database/migrations/007_admin_and_reseller_whatsapp.sql

# Migration 008
mysql -u ultragestor_db -p ultragestor_db < database/migrations/008_default_client_templates.sql

# Migration 009
mysql -u ultragestor_db -p ultragestor_db < database/migrations/009_admin_payment_methods.sql

# Migration 010
mysql -u ultragestor_db -p ultragestor_db < database/migrations/010_trial_system.sql

# Migration 011
mysql -u ultragestor_db -p ultragestor_db < database/migrations/011_add_whatsapp_to_resellers.sql

# Migration 012
mysql -u ultragestor_db -p ultragestor_db < database/migrations/012_password_reset_tokens.sql
```

---

## Opção 3: Via phpMyAdmin (aaPanel)

1. Acesse: **aaPanel → Database → phpMyAdmin**
2. Selecione o banco `ultragestor_db`
3. Vá em **Import**
4. Faça upload do arquivo `database/INSTALAR_WORKBENCH.sql`
5. Clique em **Go**
6. Repita para cada migration em `database/migrations/` (em ordem numérica)

---

## Opção 4: Comando Único (Todas as Migrations)

```bash
# Criar script temporário
cat > /tmp/import-all.sh << 'EOF'
#!/bin/bash
DB_USER="ultragestor_db"
DB_NAME="ultragestor_db"
BASE_DIR="/www/wwwroot/ultragestor.site"

echo "Importando schema principal..."
mysql -u $DB_USER -p $DB_NAME < $BASE_DIR/database/INSTALAR_WORKBENCH.sql

echo "Importando migrations..."
for file in $BASE_DIR/database/migrations/*.sql; do
    echo "  → $(basename $file)"
    mysql -u $DB_USER -p $DB_NAME < "$file"
done

echo "✅ Concluído!"
EOF

# Executar
chmod +x /tmp/import-all.sh
bash /tmp/import-all.sh
```

---

## Verificar Instalação

```bash
# Conectar ao MySQL
mysql -u ultragestor_db -p ultragestor_db

# Listar tabelas
SHOW TABLES;

# Verificar estrutura de uma tabela
DESCRIBE users;

# Sair
EXIT;
```

---

## Troubleshooting

### Erro: "No such file or directory"

**Causa:** Você não está no diretório correto

**Solução:**
```bash
cd /www/wwwroot/ultragestor.site
pwd  # Confirmar que está no lugar certo
ls database/  # Confirmar que o diretório existe
```

### Erro: "Access denied"

**Causa:** Credenciais incorretas

**Solução:**
```bash
# Verificar credenciais no aaPanel
# aaPanel → Database → ultragestor_db → Ver senha

# Testar conexão
mysql -u ultragestor_db -p
# Digite a senha quando solicitado
```

### Erro: "Table already exists"

**Causa:** Tabela já foi criada anteriormente

**Solução:** Isso é normal, pode ignorar ou dropar o banco e recriar:
```bash
# CUIDADO: Isso apaga todos os dados!
mysql -u ultragestor_db -p -e "DROP DATABASE ultragestor_db; CREATE DATABASE ultragestor_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### Erro: "Unknown database"

**Causa:** Banco não existe

**Solução:**
```bash
# Criar banco
mysql -u root -p -e "CREATE DATABASE ultragestor_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Ou via aaPanel: Database → Add Database
```

---

## Verificar Dados Iniciais

```sql
-- Conectar ao banco
mysql -u ultragestor_db -p ultragestor_db

-- Verificar usuário admin
SELECT * FROM users WHERE email = 'admin@admin.com';

-- Verificar planos
SELECT * FROM subscription_plans;

-- Verificar templates WhatsApp
SELECT * FROM whatsapp_reminder_templates;
```

---

## Credenciais Padrão

Após instalação, use:

- **Email:** admin@admin.com
- **Senha:** admin123

⚠️ **IMPORTANTE:** Altere a senha após primeiro login!

---

## Próximos Passos

Após importar o banco:

1. ✅ Configure o `.env`
2. ✅ Instale dependências: `npm install && composer install`
3. ✅ Build do frontend: `npm run build`
4. ✅ Configure PM2 para processos
5. ✅ Configure Nginx
6. ✅ Teste o sistema

