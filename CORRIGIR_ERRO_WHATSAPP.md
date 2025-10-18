# 🔧 Corrigir Erro: Column 'whatsapp' not found

## ❌ Problema
Ao tentar registrar um novo usuário, aparece o erro:
```
SQLSTATE[42S22]: Column not found: 1054 Unknown column 'whatsapp' in 'field list'
```

## ✅ Solução Rápida

### Opção 1: Executar via Script Automático (RECOMENDADO)

1. **Execute o arquivo batch:**
   ```bash
   run-migrations.bat
   ```

2. **Pronto!** A coluna será adicionada automaticamente.

---

### Opção 2: Executar Manualmente no MySQL Workbench

1. **Abra o MySQL Workbench**

2. **Conecte ao banco de dados `iptv_manager`**

3. **Execute o seguinte SQL:**

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
DESCRIBE resellers;
```

4. **Pronto!** Agora você pode fazer o registro.

---

### Opção 3: Via Linha de Comando MySQL

```bash
mysql -u root -p iptv_manager < database/run-migrations.sql
```

---

## 🔍 Verificar se Funcionou

Execute no MySQL:

```sql
USE iptv_manager;

SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    IS_NULLABLE 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'iptv_manager'
  AND TABLE_NAME = 'resellers'
  AND COLUMN_NAME = 'whatsapp';
```

Se retornar uma linha, está funcionando! ✅

---

## 📝 O que foi feito?

A coluna `whatsapp` foi adicionada na tabela `resellers` para armazenar o número de WhatsApp do revendedor durante o registro.

**Estrutura:**
- **Tipo:** VARCHAR(20)
- **Permite NULL:** Sim
- **Índice:** Sim (para buscas rápidas)

---

## 🚀 Próximos Passos

Após executar a migration:

1. ✅ Tente fazer o registro novamente
2. ✅ O campo WhatsApp agora será salvo corretamente
3. ✅ Você poderá usar o WhatsApp para notificações

---

## ❓ Ainda com problemas?

Verifique:

1. **MySQL está rodando?**
   ```bash
   mysql --version
   ```

2. **Credenciais corretas no .env?**
   ```
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=sua_senha
   DB_NAME=iptv_manager
   ```

3. **Banco de dados existe?**
   ```sql
   SHOW DATABASES LIKE 'iptv_manager';
   ```

---

## 📞 Suporte

Se o problema persistir, verifique os logs em:
- `php_errors.log`
- Console do navegador (F12)
