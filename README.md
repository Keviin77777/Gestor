# 🎬 GestPlay - Sistema de Gestão IPTV

Sistema completo de gestão de revendas IPTV com automação WhatsApp, pagamentos automáticos e integração Sigma.

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![PHP](https://img.shields.io/badge/PHP-8%2B-777BB4)](https://php.net/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![MySQL](https://img.shields.io/badge/MySQL-5.7%2B-4479A1)](https://www.mysql.com/)

---

## ✨ Funcionalidades Principais

### 📊 Dashboard Completo
- Visão geral de receitas, despesas e lucros
- Métricas em tempo real
- Gráficos e relatórios detalhados
- Controle total de revendas e clientes

### 👥 Gestão de Revendas
- Sistema de assinaturas com múltiplos planos
- Período de trial (teste gratuito)
- Controle de acesso e permissões
- Histórico completo de atividades
- Bloqueio automático por inadimplência

### 💰 Pagamentos Automáticos
- **Mercado Pago** - PIX com QR Code automático
- **Asaas** - Gateway completo
- **PIX Manual** - Chave PIX própria
- Webhooks para confirmação automática
- Renovação automática no Sigma após pagamento ✨

### 📱 Automação WhatsApp
- 8 tipos de mensagens automáticas
- Templates personalizáveis por revenda
- Lembretes de vencimento (7, 3, 1 dia)
- Confirmação de pagamento
- Link de pagamento nas mensagens
- Processamento em background

### 🎯 Gestão de Clientes
- Cadastro completo com planos
- Controle de vencimentos
- Geração automática de faturas
- Renovação automática no Sigma
- Histórico de pagamentos

### 🔗 Integração Sigma
- Renovação automática via webhook
- Sincronização de clientes
- Suporte a múltiplos painéis
- Logs detalhados de operações

---

## 🛠️ Tecnologias

### Frontend
- **Next.js 14** - Framework React com App Router
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização moderna
- **Shadcn/ui** - Componentes reutilizáveis
- **Lucide Icons** - Ícones modernos

### Backend
- **PHP 8+** - API REST robusta
- **MySQL** - Banco de dados relacional
- **Node.js** - Processadores em background
- **PDO** - Prepared statements para segurança

### Integrações
- **Mercado Pago API** - Gateway de pagamento
- **Asaas API** - Gateway alternativo
- **Evolution API** - WhatsApp Business
- **Sigma API** - Painel IPTV

---

## 📋 Requisitos

- PHP 8.0 ou superior
- MySQL 5.7 ou superior
- Node.js 18 ou superior
- Composer (para dependências PHP)
- NPM ou Yarn

---

## 🚀 Instalação

### 1. Clone o repositório
```bash
git clone https://github.com/seu-usuario/gestplay.git
cd gestplay
```

### 2. Instale as dependências

#### Frontend
```bash
npm install
```

#### Backend (PHP)
```bash
composer install
```

#### Scripts de background
```bash
cd scripts
npm install
cd ..
```

### 3. Configure o banco de dados

```bash
# Crie o banco de dados
mysql -u root -p -e "CREATE DATABASE gestplay CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Importe o schema principal
mysql -u root -p gestplay < database/INSTALAR_WORKBENCH.sql

# Execute as migrations em ordem
mysql -u root -p gestplay < database/migrations/001_create_whatsapp_reminder_tables.sql
mysql -u root -p gestplay < database/migrations/002_add_template_scheduling.sql
mysql -u root -p gestplay < database/migrations/003_unified_templates_system.sql
mysql -u root -p gestplay < database/migrations/004_payment_methods.sql
mysql -u root -p gestplay < database/migrations/005_update_whatsapp_templates_payment_link.sql
mysql -u root -p gestplay < database/migrations/006_reseller_subscriptions.sql
mysql -u root -p gestplay < database/migrations/007_admin_and_reseller_whatsapp.sql
mysql -u root -p gestplay < database/migrations/008_default_client_templates.sql
mysql -u root -p gestplay < database/migrations/009_admin_payment_methods.sql
mysql -u root -p gestplay < database/migrations/010_trial_system.sql
mysql -u root -p gestplay < database/migrations/012_password_reset_tokens.sql
```

### 4. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

Edite o arquivo `.env`:

```env
# Banco de Dados
DB_HOST=localhost
DB_NAME=gestplay
DB_USER=root
DB_PASS=sua_senha

# URLs
NEXT_PUBLIC_PHP_API_URL=http://localhost:8080
FRONTEND_URL=http://localhost:9002

# Mercado Pago
MP_PUBLIC_KEY=TEST-sua-public-key
MP_ACCESS_TOKEN=TEST-seu-access-token

# Asaas
ASAAS_API_KEY=sua-api-key
ASAAS_PIX_KEY=sua-chave-pix

# WhatsApp (Evolution API)
WHATSAPP_API_URL=http://localhost:8081
WHATSAPP_API_KEY=sua-api-key

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-app
SMTP_FROM=seu-email@gmail.com
SMTP_FROM_NAME=GestPlay

# Segurança
JWT_SECRET=seu-jwt-secret-super-seguro-aqui
ENCRYPTION_KEY=sua-chave-de-criptografia-32-chars
```

### 5. Inicie os serviços

#### Frontend (Next.js)
```bash
npm run dev
# Acesse: http://localhost:9002
```

#### Backend (PHP)
```bash
# Windows
php -S localhost:8080 -t .

# Linux/Mac
./start-php-server.sh
```

#### Processadores (Node.js)
```bash
# Windows
cd scripts
start-all-processors.bat

# Linux/Mac
cd scripts
./start-all-processors.sh
```

### 6. Primeiro Acesso

- **URL:** http://localhost:9002
- **Email:** admin@admin.com
- **Senha:** admin123

⚠️ **Importante:** Altere a senha padrão após o primeiro acesso!

---

## 📱 Sistema de Mensagens WhatsApp

### Tipos de Mensagens Automáticas

1. **Boas-vindas** - Ao criar cliente
2. **Fatura Disponível** - Quando fatura é gerada (com link de pagamento)
3. **7 dias antes** - Lembrete de vencimento
4. **3 dias antes** - Lembrete de vencimento
5. **Vence hoje** - Último aviso
6. **2 dias após** - Cobrança pós-vencimento
7. **5 dias após** - Cobrança final
8. **Pagamento Confirmado** - Confirmação de renovação

### Variáveis Disponíveis nos Templates

```
{{cliente_nome}}          - Nome do cliente
{{cliente_usuario}}       - Username/login
{{cliente_telefone}}      - Telefone
{{senha}}                 - Senha do cliente
{{plano}}                 - Nome do plano
{{valor}}                 - Valor da mensalidade
{{data_vencimento}}       - Data de vencimento
{{data_vencimento_extenso}} - Data por extenso
{{link_pagamento}}        - Link para checkout PIX
{{link_fatura}}           - Link alternativo
{{empresa_nome}}          - Nome da empresa
{{data_hoje}}             - Data atual
{{hora_atual}}            - Hora atual
```

### Configuração

1. Acesse **Dashboard** → **WhatsApp**
2. Configure seus templates
3. Ative os eventos desejados
4. Teste o envio

---

## 💳 Sistema de Pagamentos

### Métodos Disponíveis

#### Mercado Pago
- PIX automático com QR Code
- Webhook para confirmação
- Renovação automática no Sigma

#### Asaas
- Gateway completo
- PIX, Boleto, Cartão
- Webhook para confirmação

#### PIX Manual
- Chave PIX própria
- Checkout personalizado
- Confirmação manual

### Configuração de Webhooks

Para receber confirmações automáticas de pagamento:

1. Configure um túnel ngrok:
```bash
ngrok http 8080
```

2. Configure a URL do webhook no gateway:
```
https://seu-dominio.ngrok.io/api/webhooks/mercadopago
https://seu-dominio.ngrok.io/api/webhooks/asaas
```

3. Teste o webhook:
```bash
# Ver documentação completa
docs/GUIA_NGROK_WEBHOOK.md
```

---

## 🔗 Integração Sigma

### Configuração

1. Configure o painel Sigma:
```sql
UPDATE panels SET
  sigma_url = 'https://seu-sigma.com',
  sigma_token = 'seu-bearer-token',
  sigma_username = 'admin',
  sigma_connected = 1
WHERE id = 'seu-panel-id';
```

2. Associe clientes ao painel:
```sql
UPDATE clients SET
  username = 'cliente123',
  panel_id = 'seu-panel-id'
WHERE id = 'seu-client-id';
```

### Funcionamento

- ✅ Renovação automática após pagamento
- ✅ Usa o mesmo endpoint da baixa manual
- ✅ Logs detalhados de operações
- ✅ Suporte a múltiplos painéis

### Documentação

- 📖 [Guia Completo](docs/RENOVACAO_AUTOMATICA_SIGMA.md)
- 🐛 [Debug e Troubleshooting](docs/DEBUG_SIGMA_WEBHOOK.md)

---

## � Procesasos Automáticos

### WhatsApp Evolution Server (Porta 3002)
- Gerencia conexão com WhatsApp
- Envia mensagens
- Mantém sessão ativa
- Reconexão automática

### Reminder Processor (Porta 3003)
- Verifica clientes a cada 1 minuto
- Envia lembretes baseados em dias até vencimento
- Evita duplicatas (1 mensagem por dia por tipo)
- Logs detalhados

### Invoice Processor (Porta 3004)
- Verifica clientes a cada 1 hora
- Gera faturas 10 dias antes do vencimento
- Envia WhatsApp com link de pagamento
- Evita duplicatas

### Subscription Processor (Porta 3005)
- Verifica assinaturas de resellers
- Bloqueia acesso de inadimplentes
- Envia notificações de vencimento

---

## 📊 Monitoramento

### Verificar Status

```bash
# PM2
pm2 status

# Health checks
curl http://localhost:3002/health  # WhatsApp
curl http://localhost:3003/health  # Lembretes
curl http://localhost:3004/health  # Faturas
curl http://localhost:3005/health  # Assinaturas
```

### Ver Logs

```bash
# Todos os logs
pm2 logs

# Logs específicos
pm2 logs whatsapp-evolution
pm2 logs reminder-processor
pm2 logs invoice-processor
pm2 logs subscription-processor

# Logs em tempo real
pm2 logs --lines 100
```

### Reiniciar Serviços

```bash
# Reiniciar todos
pm2 restart all

# Reiniciar específico
pm2 restart whatsapp-evolution
pm2 restart reminder-processor
```

---

## 🗂️ Estrutura do Projeto

```
gestplay/
├── src/                          # Frontend Next.js
│   ├── app/                     # Pages (App Router)
│   │   ├── (app)/              # Rotas autenticadas
│   │   ├── (auth)/             # Rotas de autenticação
│   │   ├── checkout/           # Checkout PIX
│   │   └── api/                # API Routes
│   ├── components/              # Componentes React
│   │   ├── auth/               # Autenticação
│   │   ├── clients/            # Clientes
│   │   ├── dashboard/          # Dashboard
│   │   ├── payment/            # Pagamentos
│   │   └── ui/                 # Componentes base
│   └── hooks/                   # Custom hooks
├── api/                          # Backend PHP
│   ├── resources/               # Endpoints REST
│   ├── webhooks/                # Webhooks de pagamento
│   ├── cron/                    # Cron jobs
│   ├── lib/                     # Bibliotecas
│   ├── middleware/              # Middlewares
│   └── auth.php                 # Autenticação
├── database/                     # Banco de dados
│   ├── config.php               # Configuração PDO
│   ├── migrations/              # Migrations SQL
│   └── INSTALAR_WORKBENCH.sql  # Schema principal
├── scripts/                      # Processadores Node.js
│   ├── whatsapp-evolution-server.js
│   ├── reminder-processor.js
│   ├── invoice-processor.js
│   ├── subscription-processor.js
│   └── start-all-processors.*
├── docs/                         # Documentação
│   ├── RENOVACAO_AUTOMATICA_SIGMA.md
│   ├── DEBUG_SIGMA_WEBHOOK.md
│   ├── GUIA_NGROK_WEBHOOK.md
│   └── payment-methods-guide.md
├── public/                       # Assets públicos
├── .env                          # Variáveis de ambiente
├── .env.evolution               # Config Evolution API
└── README.md                     # Este arquivo
```

---

## 🔐 Segurança

- ✅ Autenticação JWT
- ✅ Prepared statements (SQL Injection)
- ✅ Validação de inputs
- ✅ CORS configurado
- ✅ Rate limiting
- ✅ Criptografia de senhas (bcrypt)
- ✅ Tokens de recuperação de senha
- ✅ Variáveis de ambiente
- ✅ HTTPS recomendado em produção

---

## 🚀 Deploy em Produção

### Requisitos

- Servidor Linux (Ubuntu 20.04+ recomendado)
- Nginx ou Apache
- PHP 8.0+ com extensões: pdo_mysql, curl, json, mbstring
- MySQL 5.7+
- Node.js 18+
- PM2 para gerenciar processos
- Certificado SSL (Let's Encrypt)

### Passos

1. **Configure o servidor web**
```bash
# Nginx
sudo nano /etc/nginx/sites-available/gestplay

# Apache
sudo nano /etc/apache2/sites-available/gestplay.conf
```

2. **Configure SSL**
```bash
sudo certbot --nginx -d seu-dominio.com
```

3. **Build do frontend**
```bash
npm run build
npm start
```

4. **Configure PM2**
```bash
cd scripts
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

5. **Configure cron jobs**
```bash
crontab -e
# Adicione:
0 * * * * cd /var/www/gestplay && php api/cron/auto-generate-invoices.php
*/5 * * * * cd /var/www/gestplay && php api/cron/auto-process-reminders.php
```

### Documentação Completa

📖 [Guia de Deploy Completo](docs/DEPLOY_PRODUCAO_COMPLETO.md)

---

## 🆘 Troubleshooting

### WhatsApp não conecta

1. Verifique se Evolution API está rodando
2. Verifique as credenciais no `.env.evolution`
3. Escaneie o QR Code novamente
4. Ver logs: `pm2 logs whatsapp-evolution`

### Lembretes não enviam

1. Verifique se o processor está rodando: `pm2 status`
2. Verifique se os templates estão ativos
3. Verifique se os clientes têm telefone
4. Ver logs: `pm2 logs reminder-processor`

### Pagamentos não confirmam automaticamente

1. Verifique se o webhook está configurado
2. Teste o webhook: `curl -X POST sua-url/api/webhooks/mercadopago`
3. Verifique os logs do PHP
4. Consulte: [Guia de Webhooks](docs/GUIA_NGROK_WEBHOOK.md)

### Sigma não renova automaticamente

1. Verifique se o painel tem Sigma configurado
2. Verifique se o cliente tem username
3. Teste manualmente: `php test-sigma-webhook.php` (em archive/old-tests)
4. Ver logs: `tail -f /var/log/php_errors.log | grep "Webhook Sigma"`
5. Consulte: [Debug Sigma](docs/DEBUG_SIGMA_WEBHOOK.md)

---

## 📚 Documentação Adicional

- 📖 [Configuração de Email](docs/CONFIGURACAO_EMAIL_COMPLETA.md)
- 📖 [Templates WhatsApp](docs/CRIAR_TEMPLATES_WHATSAPP.md)
- 📖 [Sistema de Assinaturas](docs/SUBSCRIPTION_BLOCKING_SYSTEM.md)
- 📖 [Recuperação de Senha](docs/TESTE_RECUPERACAO_SENHA.md)
- 📖 [Landing Page Dinâmica](docs/LANDING_PAGE_PLANOS_DINAMICOS.md)

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

---

## 📝 Changelog

### v2.0.0 (2025-01-15)
- ✨ Renovação automática no Sigma após pagamento
- ✨ Sistema de recuperação de senha
- ✨ Templates WhatsApp com link de pagamento
- 🐛 Correções de bugs diversos
- 📚 Documentação atualizada

### v1.5.0 (2024-12-01)
- ✨ Sistema de assinaturas para resellers
- ✨ Período de trial
- ✨ Bloqueio automático por inadimplência

### v1.0.0 (2024-10-01)
- 🎉 Lançamento inicial

---

## 📄 Licença

Proprietary - Todos os direitos reservados

---

## 👨‍💻 Suporte

Para suporte técnico:
- 📧 Email: suporte@gestplay.com
- 💬 WhatsApp: (XX) XXXXX-XXXX
- 📖 Documentação: [docs/](docs/)

---

**Desenvolvido com ❤️ para gestão profissional de IPTV**
