# ⚡ SOLUÇÃO RÁPIDA - API 403 FORBIDDEN

## 🎯 Problema Identificado

1. **putenv() desabilitado** no PHP 8.1
2. **Pasta storage/ não existe** (rate limiting precisa gravar arquivos)
3. **.env não está sendo carregado** corretamente

## 🚀 Solução em 3 Passos

### Passo 1: Executar Script de Correção

```bash
cd /www/wwwroot/ultragestor.site/Gestor
bash fix-api-production.sh
```

Este script vai:
- ✅ Criar pasta `storage/` com permissões corretas
- ✅ Corrigir permissões da API e .env
- ✅ Testar carregamento do .env
- ✅ Verificar se putenv() está habilitado
- ✅ Testar API via HTTP

### Passo 2: Habilitar putenv() no PHP

**No aaPanel:**

1. Vá em **Software**
2. Clique em **PHP 8.1**
3. Clique em **Settings**
4. Aba **Disabled Functions**
5. **Remova** `putenv` da lista
6. Clique em **Save**

**Depois reinicie:**

```bash
systemctl restart php-fpm-81
```

### Passo 3: Testar API

```bash
# Teste 1: API online
curl https://ultragestor.site/api/

# Deve retornar:
# {"message":"IPTV Manager API v1.0","status":"online"}

# Teste 2: Login
curl -X POST https://ultragestor.site/api/auth \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@admin.com","password":"admin123","action":"login"}'

# Deve retornar um token JWT
```

## 🔧 O Que Foi Corrigido no Código

### 1. Função Helper `env()`

Criada função que funciona mesmo com putenv() desabilitado:

```php
function env($key, $default = null) {
    return $_ENV[$key] ?? $_SERVER[$key] ?? getenv($key) ?: $default;
}
```

### 2. Carregamento do .env

Agora usa `$_ENV` e `$_SERVER` em vez de apenas `putenv()`:

```php
foreach ($lines as $line) {
    // ...
    $_ENV[$key] = $value;
    $_SERVER[$key] = $value;
    
    // Tenta putenv se disponível
    if (function_exists('putenv')) {
        @putenv($key . '=' . $value);
    }
}
```

### 3. Classes JWT e Encryption

Agora usam a função `env()`:

```php
// Antes:
$jwt_secret = getenv('JWT_SECRET');

// Depois:
$jwt_secret = env('JWT_SECRET');
```

## 📊 Checklist de Verificação

Execute e marque:

```bash
# 1. Pasta storage existe e tem permissão
ls -la storage/
# Deve mostrar: drwxr-xr-x www www

# 2. API tem permissões corretas
ls -la api/ | head -n 5
# Deve mostrar: -rw-r--r-- www www

# 3. .env tem permissões corretas
ls -la .env
# Deve mostrar: -rw-r--r-- www www

# 4. putenv está habilitado
php -r "echo function_exists('putenv') ? 'OK' : 'ERRO';"
# Deve mostrar: OK

# 5. .env está sendo carregado
php api/test-env.php
# Deve mostrar variáveis carregadas

# 6. API responde
curl https://ultragestor.site/api/
# Deve retornar: {"message":"IPTV Manager API v1.0","status":"online"}
```

## 🆘 Se Ainda Não Funcionar

### Erro: "Call to undefined function putenv()"

```bash
# Verificar se putenv está na lista de funções desabilitadas
php -r "echo ini_get('disable_functions');"

# Se aparecer "putenv", remova no aaPanel e reinicie
systemctl restart php-fpm-81
```

### Erro: "Permission denied" em storage/

```bash
chown -R www:www /www/wwwroot/ultragestor.site/Gestor/storage
chmod -R 755 /www/wwwroot/ultragestor.site/Gestor/storage
```

### Erro: "JWT_SECRET not set"

```bash
# Verificar se .env existe e tem a variável
grep JWT_SECRET /www/wwwroot/ultragestor.site/Gestor/.env

# Se não tiver, adicione:
echo "JWT_SECRET=6D3A0A37E50B8FE795EC906B07203EFA7F397AC5542FA8E2189F62924410D27E" >> .env
```

### API retorna HTML em vez de JSON

Problema no Nginx. Verifique a configuração:

```bash
cat /www/server/panel/vhost/nginx/ultragestor.site.conf | grep -A 20 "location /api"
```

Deve ter:

```nginx
location ~ ^/api(/.*)?$ {
    fastcgi_pass unix:/tmp/php-cgi-81.sock;
    fastcgi_index index.php;
    fastcgi_param SCRIPT_FILENAME /www/wwwroot/ultragestor.site/Gestor/api/index.php;
    # ...
}
```

## 📞 Suporte

Se precisar de ajuda, forneça:

1. Saída do comando: `bash fix-api-production.sh`
2. Logs de erro: `tail -n 50 /www/wwwlogs/ultragestor.site.error.log`
3. Resposta da API: `curl -v https://ultragestor.site/api/`

## ✅ Resultado Final Esperado

```bash
$ curl https://ultragestor.site/api/
{"message":"IPTV Manager API v1.0","status":"online"}

$ curl -X POST https://ultragestor.site/api/auth -H "Content-Type: application/json" -d '{"email":"admin@admin.com","password":"admin123","action":"login"}'
{"success":true,"token":"eyJ0eXAiOiJKV1Qi...","user":{"id":1,"name":"Admin",...}}
```

🎉 **API funcionando!**
