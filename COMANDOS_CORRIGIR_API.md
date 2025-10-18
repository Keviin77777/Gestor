# 🚀 COMANDOS PARA CORRIGIR API - EXECUTE NO SERVIDOR

## ⚡ Solução Rápida (Copie e Cole)

```bash
# 1. Ir para o diretório do projeto
cd /www/wwwroot/ultragestor.site/Gestor

# 2. Criar pasta storage
mkdir -p storage
chown -R www:www storage
chmod -R 755 storage

# 3. Corrigir permissões da API
chown -R www:www api/
chmod -R 755 api/
find api/ -type f -name "*.php" -exec chmod 644 {} \;

# 4. Corrigir permissões do .env
chmod 644 .env
chown www:www .env

# 5. Habilitar putenv no PHP (IMPORTANTE!)
# No aaPanel: Software → PHP 8.1 → Settings → Disabled Functions
# Remova "putenv" da lista e clique em Save

# 6. Reiniciar PHP-FPM
systemctl restart php-fpm-81

# 7. Testar API
curl https://ultragestor.site/api/
```

## 📋 Passo a Passo Detalhado

### 1️⃣ Criar Pasta Storage

A API precisa da pasta `storage/` para gravar logs de rate limiting:

```bash
cd /www/wwwroot/ultragestor.site/Gestor
mkdir -p storage
chown -R www:www storage
chmod -R 755 storage
```

### 2️⃣ Corrigir Permissões

```bash
# Permissões da API
chown -R www:www api/
chmod -R 755 api/
find api/ -type f -name "*.php" -exec chmod 644 {} \;

# Permissões do .env
chmod 644 .env
chown www:www .env

# Verificar
ls -la api/ | head -n 10
ls -la .env
ls -la storage/
```

### 3️⃣ Habilitar putenv() no PHP

**CRÍTICO**: A função `putenv()` está desabilitada no PHP 8.1

#### Opção A: Via aaPanel (Recomendado)

1. Acesse o aaPanel
2. Vá em **Software**
3. Clique em **PHP 8.1**
4. Clique em **Settings**
5. Vá na aba **Disabled Functions**
6. Procure por `putenv` na lista
7. **Remova** `putenv` da lista
8. Clique em **Save**
9. Reinicie o PHP-FPM

#### Opção B: Via Linha de Comando

```bash
# Editar php.ini
nano /www/server/php/81/etc/php.ini

# Procure por: disable_functions
# Remova "putenv" da lista

# Salvar: Ctrl+O, Enter, Ctrl+X

# Reiniciar PHP-FPM
systemctl restart php-fpm-81
```

### 4️⃣ Verificar Configuração do PHP

```bash
# Ver funções desabilitadas
php -r "echo ini_get('disable_functions');"

# Testar putenv
php -r "if (function_exists('putenv')) { echo 'putenv OK\n'; } else { echo 'putenv DESABILITADO\n'; }"

# Ver versão do PHP
php -v
```

### 5️⃣ Testar Carregamento do .env

```bash
# Criar arquivo de teste
cat > /www/wwwroot/ultragestor.site/Gestor/api/test-env.php << 'EOF'
<?php
require_once __DIR__ . '/security.php';

echo "=== TESTE DE AMBIENTE ===\n\n";

// Testar função env()
echo "DB_HOST: " . env('DB_HOST', 'não definido') . "\n";
echo "DB_NAME: " . env('DB_NAME', 'não definido') . "\n";
echo "JWT_SECRET: " . (env('JWT_SECRET') ? 'definido' : 'não definido') . "\n";
echo "API_URL: " . env('API_URL', 'não definido') . "\n";

echo "\n=== TESTE DE STORAGE ===\n";
$storage_dir = __DIR__ . '/../storage';
echo "Existe: " . (is_dir($storage_dir) ? 'sim' : 'não') . "\n";
echo "Gravável: " . (is_writable($storage_dir) ? 'sim' : 'não') . "\n";

echo "\n✅ Teste concluído!\n";
EOF

# Executar teste
php /www/wwwroot/ultragestor.site/Gestor/api/test-env.php
```

### 6️⃣ Testar API via HTTP

```bash
# Teste 1: Verificar se API está online
curl https://ultragestor.site/api/

# Deve retornar:
# {"message":"IPTV Manager API v1.0","status":"online"}

# Teste 2: Testar login
curl -X POST https://ultragestor.site/api/auth \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@admin.com","password":"admin123","action":"login"}'

# Deve retornar um token JWT
```

### 7️⃣ Verificar Logs de Erro

```bash
# Logs do Nginx
tail -f /www/wwwlogs/ultragestor.site.error.log

# Logs do PHP-FPM
tail -f /www/server/php/81/var/log/php-fpm.log

# Se não existir, criar:
touch /www/server/php/81/var/log/php-fpm.log
chown www:www /www/server/php/81/var/log/php-fpm.log
```

## 🔍 Diagnóstico de Problemas

### Erro: "Call to undefined function putenv()"

**Solução**: Habilite putenv no PHP (passo 3)

### Erro: "Permission denied" ao gravar em storage/

**Solução**:
```bash
chown -R www:www /www/wwwroot/ultragestor.site/Gestor/storage
chmod -R 755 /www/wwwroot/ultragestor.site/Gestor/storage
```

### Erro: "JWT_SECRET not set"

**Solução**: Verifique se o .env está sendo carregado:
```bash
php -r "require 'api/security.php'; echo env('JWT_SECRET') ? 'OK' : 'ERRO';"
```

### Erro: 403 Forbidden

**Solução**: Verifique a configuração do Nginx (ver CORRIGIR_API_403.md)

### Erro: "Endpoint not found"

**Solução**: Verifique se o Nginx está passando o REQUEST_URI corretamente:
```bash
# Ver configuração do Nginx
cat /www/server/panel/vhost/nginx/ultragestor.site.conf | grep -A 20 "location /api"
```

## ✅ Checklist Final

Execute cada comando e marque:

- [ ] Pasta storage criada com permissões corretas
- [ ] Permissões da API corrigidas (www:www, 755/644)
- [ ] Permissões do .env corrigidas (www:www, 644)
- [ ] putenv() habilitado no PHP
- [ ] PHP-FPM reiniciado
- [ ] Teste do .env passou (php api/test-env.php)
- [ ] API responde: curl https://ultragestor.site/api/
- [ ] Login funciona: curl POST /api/auth
- [ ] Sem erros nos logs do Nginx
- [ ] Sem erros nos logs do PHP-FPM

## 🎯 Resultado Esperado

Após executar todos os comandos, você deve ver:

```bash
# curl https://ultragestor.site/api/
{"message":"IPTV Manager API v1.0","status":"online"}

# curl -X POST https://ultragestor.site/api/auth -H "Content-Type: application/json" -d '{"email":"admin@admin.com","password":"admin123","action":"login"}'
{"success":true,"token":"eyJ0eXAiOiJKV1QiLCJhbGc...","user":{...}}
```

## 📞 Próximos Passos

Após a API funcionar:

1. ✅ Testar login no frontend: https://ultragestor.site
2. ✅ Verificar PM2 (processos Node.js): `pm2 list`
3. ✅ Testar criação de clientes
4. ✅ Testar geração de faturas
5. ✅ Configurar Evolution API (WhatsApp)

## 🆘 Se Nada Funcionar

Execute o script de diagnóstico completo:

```bash
cd /www/wwwroot/ultragestor.site/Gestor
bash fix-api-production.sh
```

Isso vai criar um relatório completo do ambiente e sugerir correções.
