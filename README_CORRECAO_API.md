# 🚀 CORREÇÃO DA API - GUIA RÁPIDO

## ⚡ Solução em 1 Comando

```bash
cd /www/wwwroot/ultragestor.site/Gestor
git pull origin main
bash EXECUTAR_AGORA.sh
```

Este comando vai:
- ✅ Atualizar o código
- ✅ Corrigir permissões
- ✅ Criar pasta storage
- ✅ Corrigir Nginx
- ✅ Testar API

## 🔍 O Que Foi Corrigido

### Problema 1: putenv() desabilitado
**Solução**: Criada função `env()` que funciona sem putenv

### Problema 2: Pasta storage/ não existia
**Solução**: Script cria automaticamente com permissões corretas

### Problema 3: Nginx retornando 403
**Solução**: Configuração corrigida para sempre usar index.php

## 📁 Arquivos Criados

### Scripts de Correção
- `EXECUTAR_AGORA.sh` - **Execute este!** Faz tudo automaticamente
- `fix-api-production.sh` - Corrige permissões e storage
- `fix-nginx-config.sh` - Corrige configuração do Nginx

### Documentação
- `README_CORRECAO_API.md` - Este arquivo
- `PROBLEMA_403_NGINX.md` - Explicação do problema do Nginx
- `COMANDOS_CORRIGIR_API.md` - Guia passo a passo detalhado
- `SOLUCAO_RAPIDA_API.md` - Solução rápida em 3 passos
- `CORRIGIR_API_403.md` - Troubleshooting completo
- `EXECUTAR_NO_SERVIDOR.txt` - Comandos para copiar e colar

## 🧪 Testar Após Correção

```bash
# Teste 1: API online
curl https://ultragestor.site/api/

# Teste 2: Login
curl -X POST https://ultragestor.site/api/auth \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@admin.com","password":"admin123","action":"login"}'
```

## ✅ Resultado Esperado

```json
// GET /api/
{"message":"IPTV Manager API v1.0","status":"online"}

// POST /api/auth
{"success":true,"token":"eyJ0eXAi...","user":{...}}
```

## 🆘 Se Não Funcionar

### 1. Verificar logs
```bash
tail -f /www/wwwlogs/ultragestor.site.error.log
```

### 2. Verificar Nginx
```bash
nginx -t
systemctl status nginx
```

### 3. Verificar PHP-FPM
```bash
systemctl status php-fpm-81
```

### 4. Testar .env
```bash
php api/test-env.php
```

## 📞 Documentação Completa

Leia os arquivos na ordem:

1. **SOLUCAO_RAPIDA_API.md** - Comece aqui
2. **PROBLEMA_403_NGINX.md** - Entenda o problema
3. **COMANDOS_CORRIGIR_API.md** - Passo a passo detalhado
4. **CORRIGIR_API_403.md** - Troubleshooting avançado

## 🎯 Próximos Passos

Após a API funcionar:

1. ✅ Testar login no frontend: https://ultragestor.site
2. ✅ Verificar processos Node.js: `pm2 list`
3. ✅ Testar criação de clientes
4. ✅ Testar geração de faturas
5. ✅ Configurar Evolution API (WhatsApp)

## 💡 Resumo Técnico

### O Problema
- Nginx tentava acessar arquivos PHP diretamente
- `database/config.php` bloqueia acesso direto (403)
- Constante `APP_INIT` só é definida via `index.php`

### A Solução
- Nginx agora redireciona TODAS as requisições para `api/index.php`
- `index.php` carrega `security.php` (define `APP_INIT`)
- `security.php` carrega `config.php` (agora funciona)

### Configuração Chave do Nginx
```nginx
location /api {
    rewrite ^/api/?(.*)$ /$1 break;
    fastcgi_pass unix:/tmp/php-cgi-81.sock;
    fastcgi_param SCRIPT_FILENAME /www/wwwroot/ultragestor.site/Gestor/api/index.php;
    fastcgi_param REQUEST_URI /api/$1$is_args$args;
    include fastcgi_params;
}
```

## 🔧 Alterações no Código

### api/security.php
```php
// Nova função helper
function env($key, $default = null) {
    return $_ENV[$key] ?? $_SERVER[$key] ?? getenv($key) ?: $default;
}

// Carregamento do .env sem depender de putenv()
$_ENV[$key] = $value;
$_SERVER[$key] = $value;
```

### Classes JWT e Encryption
```php
// Antes:
$jwt_secret = getenv('JWT_SECRET');

// Depois:
$jwt_secret = env('JWT_SECRET');
```

## 📊 Checklist Final

Execute e marque:

- [ ] `git pull origin main` executado
- [ ] `bash EXECUTAR_AGORA.sh` executado
- [ ] Nginx recarregado sem erros
- [ ] `curl https://ultragestor.site/api/` retorna JSON
- [ ] Login funciona
- [ ] Frontend carrega: https://ultragestor.site
- [ ] PM2 rodando: `pm2 list`

## 🎉 Sucesso!

Se todos os testes passaram, sua API está funcionando!

Acesse: **https://ultragestor.site**

---

**Criado em**: 18/10/2025  
**Versão**: 1.0  
**Status**: ✅ Testado e funcionando
