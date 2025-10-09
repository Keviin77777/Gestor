# 🎬 GestPlay - Sistema de Gestão IPTV

Sistema completo de gestão de clientes IPTV com integração WhatsApp, geração automática de faturas e lembretes.

---

## 🚀 Funcionalidades

### Frontend (Next.js)
- ✅ Dashboard administrativo
- ✅ Gestão de clientes
- ✅ Gestão de faturas
- ✅ Gestão de planos
- ✅ Templates de WhatsApp
- ✅ Relatórios e estatísticas

### Backend (PHP)
- ✅ API REST completa
- ✅ Autenticação JWT
- ✅ Integração com Sigma IPTV
- ✅ Geração automática de faturas
- ✅ Envio automático de WhatsApp

### Automações (Node.js)
- ✅ **WhatsApp Server** - Servidor de mensagens
- ✅ **Reminder Processor** - Lembretes automáticos
- ✅ **Invoice Processor** - Geração de faturas

---

## 📋 Requisitos

- Node.js 18+
- PHP 8.0+
- MySQL 8.0+
- Apache/Nginx

---

## 🔧 Instalação

### 1. Clonar Repositório
```bash
git clone seu-repositorio
cd gestplay
```

### 2. Instalar Dependências

**Frontend:**
```bash
npm install
```

**Processadores Node:**
```bash
cd scripts
npm install
cd ..
```

### 3. Configurar Ambiente

Copiar `.env.example` para `.env` e configurar:

```env
# Banco de Dados
DB_HOST=localhost
DB_PORT=3306
DB_NAME=iptv_manager
DB_USER=root
DB_PASS=sua-senha

# WhatsApp
WHATSAPP_API_URL=http://localhost:3002
WHATSAPP_API_KEY=sua-chave-api

# JWT
JWT_SECRET=sua-chave-secreta
```

### 4. Criar Banco de Dados

```bash
mysql -u root -p < database/schema.sql
```

---

## 🚀 Executar

### Desenvolvimento

**Frontend:**
```bash
npm run dev
```

**Backend PHP:**
```bash
# Apache/Nginx já deve estar configurado
```

**Processadores Node:**
```bash
cd scripts
start-all-processors.bat  # Windows
./start-all-processors.sh # Linux/Mac
```

### Produção

**Com PM2 (Recomendado):**
```bash
# Instalar PM2
npm install -g pm2

# Iniciar serviços
cd scripts
pm2 start whatsapp-server.js --name "whatsapp"
pm2 start reminder-processor.js --name "lembretes"
pm2 start invoice-processor.js --name "faturas"

# Salvar configuração
pm2 save

# Configurar auto-start
pm2 startup
```

**Frontend:**
```bash
npm run build
pm2 start npm --name "frontend" -- start
pm2 save
```

---

## 📱 Templates WhatsApp

O sistema envia 8 tipos de mensagens automáticas:

1. **Boas-vindas** - Ao criar cliente
2. **Fatura Disponível** - Quando fatura é gerada
3. **Prestes a Vencer (7 dias)** - 7 dias antes
4. **Prestes a Vencer (3 dias)** - 3 dias antes
5. **Vence Hoje** - No dia do vencimento
6. **Após Vencimento (2 dias)** - 2 dias depois
7. **Após Vencimento (5 dias)** - 5 dias depois
8. **Renovação Confirmada** - Ao marcar fatura como paga

### Variáveis Disponíveis

- `{{cliente_nome}}` - Nome do cliente
- `{{cliente_usuario}}` - Usuário/login
- `{{senha}}` - Senha
- `{{plano}}` - Nome do plano
- `{{valor}}` - Valor
- `{{data_vencimento}}` - Data de vencimento

---

## 🔄 Processos Automáticos

### WhatsApp Server (Porta 3002)
- Gerencia conexão com WhatsApp
- Envia mensagens
- Mantém sessão ativa

### Reminder Processor (Porta 3003)
- Verifica clientes a cada 1 minuto
- Envia lembretes baseados em dias até vencimento
- Evita duplicatas (1 mensagem por dia)

### Invoice Processor (Porta 3004)
- Verifica clientes a cada 1 hora
- Gera faturas 10 dias antes do vencimento
- Envia WhatsApp automaticamente

---

## 📊 Monitoramento

### Verificar Status dos Serviços

```bash
# PM2
pm2 status

# Endpoints de Health
curl http://localhost:3003/health  # Lembretes
curl http://localhost:3004/health  # Faturas
```

### Ver Logs

```bash
# PM2
pm2 logs

# Logs específicos
pm2 logs whatsapp
pm2 logs lembretes
pm2 logs faturas
```

---

## 🗂️ Estrutura do Projeto

```
gestplay/
├── src/                    # Frontend Next.js
│   ├── app/               # Pages
│   ├── components/        # Componentes React
│   └── hooks/             # Custom hooks
├── api/                    # Backend PHP
│   ├── resources/         # Endpoints REST
│   └── cron/              # Cron jobs
├── database/              # Banco de dados
│   ├── config.php         # Configuração
│   └── schema.sql         # Schema
├── scripts/               # Processadores Node
│   ├── whatsapp-server.js
│   ├── reminder-processor.js
│   ├── invoice-processor.js
│   └── start-all-processors.*
└── public/                # Assets públicos
```

---

## 🔐 Segurança

- ✅ Autenticação JWT
- ✅ Prepared statements (SQL Injection)
- ✅ Validação de inputs
- ✅ CORS configurado
- ✅ Rate limiting
- ✅ Variáveis de ambiente

---

## 🆘 Troubleshooting

### WhatsApp não envia

1. Verificar se WhatsApp Server está rodando
2. Verificar templates no banco de dados
3. Verificar variáveis de ambiente
4. Ver logs: `pm2 logs whatsapp`

### Lembretes não enviam

1. Verificar se Reminder Processor está rodando
2. Verificar se cliente tem telefone
3. Ver logs: `pm2 logs lembretes`

### Faturas não são geradas

1. Verificar se Invoice Processor está rodando
2. Verificar se cliente tem vencimento em até 10 dias
3. Ver logs: `pm2 logs faturas`

---

## 📝 Licença

Proprietary - Todos os direitos reservados

---

## 👨‍💻 Suporte

Para suporte, entre em contato através do email ou WhatsApp.

---

**Desenvolvido com ❤️ para gestão profissional de IPTV**
