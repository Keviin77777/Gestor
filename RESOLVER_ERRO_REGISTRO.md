# 🚨 Como Resolver o Erro de Registro

## Erro Encontrado
```
Column not found: 1054 Unknown column 'whatsapp' in 'field list'
```

---

## ✅ Solução em 3 Passos

### **Passo 1: Verificar o Problema**

Execute o diagnóstico para confirmar que a coluna está faltando:

```bash
check-database.bat
```

Procure por esta linha no resultado:
```
❌ Coluna whatsapp NÃO EXISTE
```

---

### **Passo 2: Corrigir o Banco de Dados**

Execute a migration para adicionar a coluna:

```bash
run-migrations.bat
```

Você verá:
```
✅ MIGRATIONS EXECUTADAS COM SUCESSO!
```

---

### **Passo 3: Testar o Registro**

1. Acesse a página de registro
2. Preencha os dados:
   - Email
   - Senha (mínimo 8 caracteres, letras e números)
   - Nome de exibição
   - **WhatsApp** (mínimo 10 dígitos)
3. Clique em "Registrar"

✅ **Deve funcionar agora!**

---

## 🔧 Alternativa: Executar Manualmente

Se os scripts .bat não funcionarem, execute direto no MySQL:

### **1. Abra o MySQL Workbench ou linha de comando**

### **2. Execute este SQL:**

```sql
USE iptv_manager;

-- Adicionar coluna whatsapp
ALTER TABLE resellers 
ADD COLUMN whatsapp VARCHAR(20) NULL 
COMMENT 'Número de WhatsApp do revendedor' 
AFTER display_name;

-- Adicionar índice
ALTER TABLE resellers 
ADD INDEX idx_whatsapp (whatsapp);

-- Verificar
SELECT 'Coluna adicionada com sucesso!' as status;
DESCRIBE resellers;
```

---

## 📋 Checklist de Verificação

Antes de executar, verifique:

- [ ] MySQL está rodando
- [ ] Arquivo `.env` existe e está configurado
- [ ] Credenciais do banco estão corretas
- [ ] Banco de dados `iptv_manager` existe

---

## 🎯 O que Aconteceu?

O sistema foi atualizado para incluir o campo **WhatsApp** no cadastro de revendedores, mas a coluna não foi adicionada no banco de dados.

**Solução:** Executar a migration que adiciona a coluna.

---

## 📊 Estrutura da Coluna

Após a correção, a tabela `resellers` terá:

```
+---------------+-------------+------+-----+---------+
| Field         | Type        | Null | Key | Default |
+---------------+-------------+------+-----+---------+
| id            | varchar(36) | NO   | PRI | NULL    |
| email         | varchar(255)| NO   | UNI | NULL    |
| display_name  | varchar(255)| YES  |     | NULL    |
| whatsapp      | varchar(20) | YES  | MUL | NULL    | ← NOVA COLUNA
| password_hash | varchar(255)| YES  |     | NULL    |
| ...           | ...         | ...  | ... | ...     |
+---------------+-------------+------+-----+---------+
```

---

## 🚀 Após Corrigir

Você poderá:

1. ✅ Registrar novos usuários com WhatsApp
2. ✅ Receber notificações via WhatsApp
3. ✅ Usar todas as funcionalidades do sistema

---

## ❓ Ainda com Problemas?

### **Erro: "Access denied"**
- Verifique usuário e senha no `.env`
- Confirme que o usuário tem permissões no banco

### **Erro: "Unknown database"**
- Execute o script de criação do banco primeiro
- Verifique se o nome do banco está correto

### **Erro: "Can't connect to MySQL server"**
- Verifique se o MySQL está rodando
- Confirme o host (geralmente `localhost`)
- Verifique a porta (padrão: 3306)

---

## 📞 Comandos Úteis

### Verificar se MySQL está rodando:
```bash
mysql --version
```

### Conectar ao MySQL:
```bash
mysql -u root -p
```

### Listar bancos de dados:
```sql
SHOW DATABASES;
```

### Usar o banco:
```sql
USE iptv_manager;
```

### Ver tabelas:
```sql
SHOW TABLES;
```

### Ver estrutura da tabela:
```sql
DESCRIBE resellers;
```

---

## ✨ Pronto!

Após seguir estes passos, o erro estará resolvido e você poderá registrar usuários normalmente.
