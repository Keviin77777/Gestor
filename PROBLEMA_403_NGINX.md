# 🔴 PROBLEMA: Nginx retorna 403 Forbidden

## 🔍 Diagnóstico

O problema **NÃO é o PHP** - o teste `php api/test-env.php` funcionou perfeitamente.

O problema é a **configuração do Nginx** que está tentando acessar arquivos PHP diretamente, mas o `database/config.php` bloqueia acesso direto:

```php
// database/config.php linha 11-14
if (!defined('APP_INIT')) {
    http_response_code(403);
    die('Direct access forbidden');
}
```

A constante `APP_INIT` só é definida no `api/security.php`, que é carregado pelo `api/index.php`.

## ❌ O Que Está Acontecendo

```
Cliente → Nginx → Tenta acessar /api/ diretamente
                → Nginx retorna 403 (directory index forbidden)
                → OU tenta executar config.php diretamente
                → config.php retorna 403 (APP_INIT não definido)
```

## ✅ O Que Deveria Acontecer

```
Cliente → Nginx → SEMPRE redireciona para /api/index.php
                → index.php carrega security.php (define APP_INIT)
                → security.php carrega config.php
                → Tudo funciona!
```

## 🚀 Solução

Execute o script de correção:

```bash
cd /www/wwwroot/ultragestor.site/Gestor
bash fix-nginx-config.sh
```

Este script vai:
1. ✅ Fazer backup da configuração atual
2. ✅ Criar nova configuração correta
3. ✅ Testar a configuração
4. ✅ Recarregar o Nginx
5. ✅ Testar a API

## 📝 Configuração Correta do Nginx

A chave é usar `rewrite` e sempre passar para `index.php`:

```nginx
location /api {
    # Remover /api do início do path
    rewrite ^/api/?(.*)$ /$1 break;
    
    # Passar tudo para o index.php da API
    fastcgi_pass unix:/tmp/php-cgi-81.sock;
    fastcgi_index index.php;
    
    # IMPORTANTE: Sempre usar index.php
    fastcgi_param SCRIPT_FILENAME /www/wwwroot/ultragestor.site/Gestor/api/index.php;
    fastcgi_param SCRIPT_NAME /api/index.php;
    fastcgi_param REQUEST_URI /api/$1$is_args$args;
    
    include fastcgi_params;
}
```

## 🧪 Testar Após Correção

```bash
# Teste 1: API online
curl https://ultragestor.site/api/
# Esperado: {"message":"IPTV Manager API v1.0","status":"online"}

# Teste 2: Login
curl -X POST https://ultragestor.site/api/auth \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@admin.com","password":"admin123","action":"login"}'
# Esperado: {"success":true,"token":"..."}
```

## 🔧 Correção Manual (se preferir)

Se não quiser usar o script, edite manualmente:

```bash
# 1. Fazer backup
cp /www/server/panel/vhost/nginx/ultragestor.site.conf \
   /www/server/panel/vhost/nginx/ultragestor.site.conf.backup

# 2. Editar no aaPanel
# Website → ultragestor.site → Settings → Config File
# Copie a configuração do arquivo fix-nginx-config.sh

# 3. Testar e recarregar
nginx -t
nginx -s reload
```

## 📊 Checklist

- [ ] Backup da configuração criado
- [ ] Nova configuração aplicada
- [ ] `nginx -t` passou sem erros
- [ ] Nginx recarregado
- [ ] `curl https://ultragestor.site/api/` retorna JSON
- [ ] Login funciona

## 🆘 Se Ainda Não Funcionar

### Erro: "nginx: [emerg] unknown directive"

Verifique se copiou a configuração corretamente. Não pode ter espaços extras ou caracteres especiais.

### Erro: "upstream sent too big header"

Adicione no bloco `location /api`:

```nginx
fastcgi_buffer_size 128k;
fastcgi_buffers 4 256k;
fastcgi_busy_buffers_size 256k;
```

### API ainda retorna 403

Verifique os logs:

```bash
tail -n 50 /www/wwwlogs/ultragestor.site.error.log
```

Procure por:
- "access forbidden by rule" → Há uma regra bloqueando
- "directory index forbidden" → Nginx não está redirecionando para index.php
- "FastCGI sent in stderr" → Erro no PHP

### Verificar se o socket do PHP está correto

```bash
ls -la /tmp/php-cgi*.sock
```

Se o socket for diferente de `/tmp/php-cgi-81.sock`, ajuste na configuração.

## 📞 Próximos Passos

Após a API funcionar:

1. ✅ Testar login no frontend
2. ✅ Verificar PM2: `pm2 list`
3. ✅ Testar criação de clientes
4. ✅ Configurar Evolution API

## 💡 Dica

Para evitar esse problema no futuro, sempre configure o Nginx para passar **TODAS** as requisições da API para `index.php`, nunca tente acessar arquivos PHP diretamente.
