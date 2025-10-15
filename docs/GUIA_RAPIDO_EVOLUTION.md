# 🚀 Guia Rápido: Evolution API Grátis

## ✅ Solução 100% Gratuita!

Evolution API Self-Hosted = **R$ 0,00/mês**

Você hospeda no seu próprio computador/servidor e não paga nada!

---

## 📋 Pré-requisitos

1. **Docker Desktop** (Windows/Mac)
   - Download: https://www.docker.com/products/docker-desktop
   - Instale e reinicie o PC

2. **Node.js** (já tem instalado)

---

## 🎯 Instalação em 3 Passos

### Passo 1: Instalar Docker

1. Baixe Docker Desktop
2. Instale
3. Reinicie o PC
4. Abra Docker Desktop e aguarde iniciar

### Passo 2: Instalar Evolution API

Execute o script:

```bash
install-evolution.bat
```

Isso vai:
- ✅ Baixar Evolution API
- ✅ Configurar automaticamente
- ✅ Iniciar o serviço
- ✅ Testar a conexão

### Passo 3: Iniciar Servidor Proxy

```bash
node scripts/whatsapp-evolution-server.js
```

---

## 🧪 Testar

### 1. Verificar Evolution API

Abra no navegador: http://localhost:8080

Deve mostrar: `{"status":"ok"}`

### 2. Verificar Servidor Proxy

Abra no navegador: http://localhost:3002/health

Deve mostrar status OK

### 3. Testar no Gestor

1. Vá em **WhatsApp** no gestor
2. Clique em **Conectar**
3. Escaneie o QR Code
4. Pronto! ✅

---

## 📊 Comparação de Custos

| Solução | Custo/mês | Instâncias | Estabilidade |
|---------|-----------|------------|--------------|
| Evolution Cloud | R$ 112 | Ilimitadas | ⭐⭐⭐⭐⭐ |
| **Evolution Self-Hosted** | **R$ 0** | **Ilimitadas** | **⭐⭐⭐⭐⭐** |
| Z-API | R$ 49 | 1 | ⭐⭐⭐⭐ |
| Baileys Direto | R$ 0 | Limitado | ⭐⭐ (erro 405) |

**Vencedor: Evolution Self-Hosted!** 🏆

---

## 🖥️ Produção (VPS)

Para colocar em produção, você precisa de um servidor VPS.

### Opções Baratas:

1. **Contabo** - €4/mês (~R$ 22)
   - 4GB RAM, 200GB SSD
   - https://contabo.com

2. **DigitalOcean** - $6/mês (~R$ 30)
   - 1GB RAM, 25GB SSD
   - https://digitalocean.com

3. **Vultr** - $6/mês (~R$ 30)
   - 1GB RAM, 25GB SSD
   - https://vultr.com

### Instalação no VPS:

```bash
# 1. Conectar via SSH
ssh root@seu-servidor

# 2. Instalar Docker
curl -fsSL https://get.docker.com | sh

# 3. Clonar projeto
git clone seu-repositorio
cd seu-projeto

# 4. Iniciar Evolution
docker-compose -f docker-compose-evolution.yml up -d

# 5. Iniciar proxy
npm install
node scripts/whatsapp-evolution-server.js &
```

---

## 🔧 Comandos Úteis

```bash
# Ver logs
docker logs -f evolution-api

# Parar
docker-compose -f docker-compose-evolution.yml down

# Reiniciar
docker-compose -f docker-compose-evolution.yml restart

# Atualizar
docker-compose -f docker-compose-evolution.yml pull
docker-compose -f docker-compose-evolution.yml up -d

# Ver status
docker ps
```

---

## ❓ Problemas Comuns

### Docker não inicia
- Reinicie o PC
- Abra Docker Desktop manualmente
- Aguarde alguns minutos

### Porta 8080 em uso
Edite `docker-compose-evolution.yml`:
```yaml
ports:
  - "8081:8080"  # Mude para 8081
```

E atualize `.env`:
```env
EVOLUTION_API_URL=http://localhost:8081
```

### Evolution não responde
```bash
# Ver logs
docker logs evolution-api

# Reiniciar
docker restart evolution-api
```

---

## 💰 Custo Total

### Desenvolvimento (Local):
- **R$ 0/mês** ✅

### Produção (VPS):
- **R$ 22-30/mês** (servidor)
- **R$ 0** (Evolution API)
- **Total: R$ 22-30/mês** para **ILIMITADAS instâncias**! 🎉

---

## 🎯 Próximos Passos

1. ✅ Instalar Docker
2. ✅ Executar `install-evolution.bat`
3. ✅ Iniciar `node scripts/whatsapp-evolution-server.js`
4. ✅ Testar no gestor
5. 🚀 Colocar em produção quando estiver pronto

**Está pronto para começar?** Execute `install-evolution.bat` agora! 🚀
