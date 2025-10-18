# 🔧 Resolver Erros de Banco de Dados

## Erro 1: "Access denied for user 'ultragestor_db'@'localhost' to database 'iptv_manager'"

**Causa:** O SQL está tentando usar o banco `iptv_manager` mas você tem `ultragestor_db`

**Solução:**

### Opção A: Script Automático (Recomendado)
```bash
cd /www/wwwroot/ultragestor.site/Gestor
chmod +x install-db-ultragestor.sh
bash install-db-ultragestor.sh
```

### Opção B: Corrigir Manualmente
```bash
# Criar versão corrigida do SQL
sed 's/USE iptv_manager;/USE ultragestor_db;/g' database/INSTALAR_WORKBENCH.sql > /tmp/schema-fixed.sql

# Importar
mysql -u ultragestor_db -p ultragestor_db < /tmp/schema-fixed.sql
```

---

## Erro 2: "Access denied for user 'ultragestor_db'@'localhost' (using password: YES)"

**Causa:** Senha incorreta ou usuário sem permissões

**Solução:**

### 1. Verificar senha no aaPanel
```
aaPanel → Database → ultragestor_db → Clique no ícone de olho para ver a senha
```

### 2. Resetar senha do usuário
No aaPanel:
```
Database → ultragestor_db → Alterar senha → Salvar
```

### 3. Verificar permissões do usuário
```bash
# Conectar como root
mysql -u root -p

# Verificar permissões
SHOW GRANTS FOR 'ultragestor_db'@'localhost';

# Se necessário, dar permissões
GRANT ALL PRIVILEGES ON ultragestor_db.* TO 'ultragestor_db'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 4. Testar conexão
```bash
# Testar se consegue conectar
mysql -u ultragestor_db -p

# Digite a senha
# Se conectar, digite:
USE ultragestor_db;
SHOW TABLES;
EXIT;
```

---

## Erro 3: "Unknown database 'ultragestor_db'"

**Causa:** Banco de dados não existe

**Solução:**

### Via aaPanel
```
aaPanel → Database → Add Database
Nome: ultragestor_db
Usuário: ultragestor_db
Senha: [gere uma senha forte]
```

### Via SSH
```bash
mysql -u root -p -e "CREATE DATABASE ultragestor_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

---

## Solução Completa: Recriar do Zero

Se nada funcionar, recrie tudo:

```bash
# 1. Conectar como root
mysql -u root -p

# 2. Dropar e recriar (CUIDADO: Apaga tudo!)
DROP DATABASE IF EXISTS ultragestor_db;
DROP USER IF EXISTS 'ultragestor_db'@'localhost';

CREATE DATABASE ultragestor_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'ultragestor_db'@'localhost' IDENTIFIED BY 'SUA_SENHA_FORTE_AQUI';
GRANT ALL PRIVILEGES ON ultragestor_db.* TO 'ultragestor_db'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# 3. Executar script de instalação
cd /www/wwwroot/ultragestor.site/Gestor
bash install-db-ultragestor.sh
```

---

## Verificar Instalação

```bash
# Conectar ao banco
mysql -u ultragestor_db -p ultragestor_db

# Listar tabelas (deve mostrar várias)
SHOW TABLES;

# Verificar usuário admin
SELECT * FROM users WHERE email = 'admin@admin.com';

# Verificar planos
SELECT * FROM subscription_plans;

# Sair
EXIT;
```

---

## Comandos Úteis

### Ver logs de erro do MySQL
```bash
tail -f /var/log/mysql/error.log
```

### Ver processos MySQL
```bash
mysqladmin -u root -p processlist
```

### Verificar status do MySQL
```bash
systemctl status mysql
```

### Reiniciar MySQL
```bash
systemctl restart mysql
```

---

## Ainda com problemas?

1. **Verifique se o MySQL está rodando:**
   ```bash
   systemctl status mysql
   ```

2. **Verifique se a porta 3306 está aberta:**
   ```bash
   netstat -tlnp | grep 3306
   ```

3. **Verifique logs do aaPanel:**
   ```bash
   tail -f /www/server/panel/logs/error.log
   ```

4. **Tente via phpMyAdmin:**
   - Acesse: aaPanel → Database → phpMyAdmin
   - Faça login com as credenciais
   - Importe o SQL manualmente

---

## Contato

Se continuar com problemas, forneça:
- Mensagem de erro completa
- Versão do MySQL: `mysql --version`
- Sistema operacional: `cat /etc/os-release`
