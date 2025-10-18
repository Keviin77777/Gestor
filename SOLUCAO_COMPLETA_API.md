# 🔧 SOLUÇÃO COMPLETA - API PHP NÃO FUNCIONA

## 🎯 Problema Identificado

O Next.js está funcionando, mas a **API PHP não está sendo servida** pelo Nginx/aaPanel.

### Erros no console:
```
❌ /api/public-plans → 500 (erro PHP)
❌ /auth/login → 404 (não encontrado)
❌ Retornando HTML em vez de JSON
```

---

## ✅ SOLUÇÃO RÁPIDA (Execute no servidor)

### Opção 1: Script Automático
```bash
cd /www/wwwroot/ultragestor.site
chmod +x CORRIGIR_API_PRODUCAO.sh
./CORRIGIR_API_PRODUCAO.sh
```

### Opção 2: Manual via aaPanel

1. **Acesse o aaPanel** → Website → ultragestor.site → Settings

2. **Vá em "Rewrite"** e adicione:
```nginx
# API PHP
location /api {
    alias /www/wwwroot/ultragestor.site/api;
    try_files $uri $uri/ /api/index.php?$query_string;
    
    location ~ \.php$ {
        fastcgi_pass unix:/tmp/php-cgi-74.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $request_filename;
        include fastcgi_params;
    }
}

# Next.js
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

3. **Salve e reinicie o Nginx**

---

## 🧪 TESTAR DEPOIS

```bash
# Teste 1: API local
curl http://localhost/api/auth.php

# Teste 2: API via domínio
curl https://ultragestor.site/api/auth.php

# Teste 3: Public plans
curl https://ultragestor.site/api/public-plans

# Teste 4: Login no navegador
# Acesse: https://ultragestor.site/login
```

---

## 🔍 DIAGNÓSTICO

Se ainda não funcionar, execute:
```bash
chmod +x TESTAR_API.sh
./TESTAR_API.sh
```

---

## ⚠️ IMPORTANTE

### Verificar socket PHP correto:
```bash
ls -la /tmp/php-cgi*.sock
```

Se o socket for diferente de `php-cgi-74.sock`, ajuste no Nginx:
```nginx
fastcgi_pass unix:/tmp/php-cgi-XX.sock;  # Substitua XX pela versão
```

### Versões comuns:
- PHP 7.4 → `/tmp/php-cgi-74.sock`
- PHP 8.0 → `/tmp/php-cgi-80.sock`
- PHP 8.1 → `/tmp/php-cgi-81.sock`
- PHP 8.2 → `/tmp/php-cgi-82.sock`

---

## 📊 Checklist

- [ ] Nginx configurado para servir `/api` com PHP
- [ ] Socket PHP correto no fastcgi_pass
- [ ] Permissões corretas (www:www)
- [ ] Nginx reiniciado
- [ ] API respondendo localmente
- [ ] API respondendo via domínio
- [ ] Login funcionando no navegador

---

## 🎯 Resultado Esperado

Após a correção:
```bash
curl https://ultragestor.site/api/auth.php
# Deve retornar JSON, não HTML
```

E no navegador:
- ✅ Login funciona
- ✅ Dashboard carrega
- ✅ API responde corretamente
