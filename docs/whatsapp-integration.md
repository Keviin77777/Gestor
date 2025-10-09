# Integração WhatsApp - GestPlay

Este documento explica como configurar a integração do WhatsApp com o GestPlay para envio automático de cobranças.

## APIs Gratuitas Recomendadas

### 1. Evolution API (Recomendada)
A Evolution API é uma solução gratuita e open-source para integração com WhatsApp.

**Instalação:**
```bash
# Clone o repositório
git clone https://github.com/EvolutionAPI/evolution-api.git
cd evolution-api

# Configure as variáveis de ambiente
cp .env.example .env

# Instale as dependências
npm install

# Execute a API
npm run start:prod
```

**Configuração no GestPlay:**
```env
NEXT_PUBLIC_WHATSAPP_API_URL=http://localhost:8080
```

### 2. Baileys (Alternativa)
Baileys é uma biblioteca JavaScript para WhatsApp Web.

**Instalação:**
```bash
npm install @whiskeysockets/baileys
```

### 3. Venom-bot (Alternativa)
Venom-bot é outra opção popular para automação do WhatsApp.

**Instalação:**
```bash
npm install venom-bot
```

## Configuração da Evolution API

### 1. Variáveis de Ambiente
Crie um arquivo `.env` na raiz da Evolution API:

```env
# Configurações básicas
SERVER_PORT=8080
SERVER_URL=http://localhost:8080

# Configurações do banco de dados (opcional)
DATABASE_ENABLED=false

# Configurações de autenticação (opcional)
AUTHENTICATION_API_KEY=your-api-key-here

# Configurações de webhook (opcional)
WEBHOOK_GLOBAL_URL=http://localhost:3000/api/webhook/whatsapp
WEBHOOK_GLOBAL_ENABLED=true
```

### 2. Endpoints Principais

#### Criar Sessão
```http
POST /instance/create
Content-Type: application/json

{
  "instanceName": "gestplay-session",
  "token": "your-token",
  "qrcode": true,
  "webhook": "http://localhost:3000/api/webhook/whatsapp"
}
```

#### Obter QR Code
```http
GET /instance/qrcode/gestplay-session
```

#### Enviar Mensagem
```http
POST /message/sendText/gestplay-session
Content-Type: application/json

{
  "number": "5511999999999",
  "text": "Sua mensagem aqui"
}
```

#### Verificar Status
```http
GET /instance/connectionState/gestplay-session
```

## Configuração no GestPlay

### 1. Variáveis de Ambiente
Adicione no seu arquivo `.env`:

```env
# URL da API do WhatsApp
NEXT_PUBLIC_WHATSAPP_API_URL=http://localhost:8080

# Token de autenticação (se necessário)
WHATSAPP_API_TOKEN=your-api-token

# Webhook URL para receber eventos
WHATSAPP_WEBHOOK_URL=http://localhost:3000/api/webhook/whatsapp
```

### 2. Configuração de Webhook (Opcional)
Crie um endpoint para receber eventos do WhatsApp:

```typescript
// pages/api/webhook/whatsapp.ts
import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { event, data } = req.body;
    
    switch (event) {
      case 'qrcode.updated':
        // QR Code foi atualizado
        console.log('QR Code:', data.qrcode);
        break;
        
      case 'connection.update':
        // Status da conexão mudou
        console.log('Connection:', data.state);
        break;
        
      case 'messages.upsert':
        // Nova mensagem recebida
        console.log('Message:', data.messages);
        break;
    }
    
    res.status(200).json({ success: true });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
```

## Funcionalidades Implementadas

### 1. Pareamento do WhatsApp
- Geração de QR Code
- Conexão automática
- Monitoramento de status
- Reconexão automática

### 2. Envio de Mensagens
- Mensagens de cobrança
- Lembretes de vencimento
- Avisos de suspensão
- Mensagens personalizadas

### 3. Integração com Clientes
- Botão de WhatsApp na tabela de clientes
- Envio automático ao gerar faturas
- Validação de números de telefone
- Histórico de mensagens

## Exemplo de Uso

### 1. Conectar WhatsApp
```typescript
import { useWhatsApp } from '@/hooks/use-whatsapp';

function WhatsAppPage() {
  const { connect, status } = useWhatsApp();
  
  const handleConnect = async () => {
    await connect();
  };
  
  return (
    <button onClick={handleConnect}>
      {status.connected ? 'Conectado' : 'Conectar WhatsApp'}
    </button>
  );
}
```

### 2. Enviar Cobrança
```typescript
import { useWhatsApp } from '@/hooks/use-whatsapp';

function ClientTable() {
  const { sendBillingMessage } = useWhatsApp();
  
  const handleSendBilling = async (client: Client) => {
    await sendBillingMessage(
      client.phone,
      client.name,
      100.00,
      '2024-01-31'
    );
  };
}
```

## Troubleshooting

### Problemas Comuns

1. **QR Code não aparece**
   - Verifique se a Evolution API está rodando
   - Confirme a URL da API nas variáveis de ambiente
   - Verifique os logs da API

2. **Mensagens não são enviadas**
   - Confirme se o WhatsApp está conectado
   - Verifique o formato do número de telefone
   - Confirme se a sessão está ativa

3. **Conexão perdida**
   - A Evolution API reconecta automaticamente
   - Verifique se o celular está conectado à internet
   - Reinicie a sessão se necessário

### Logs Úteis

```bash
# Logs da Evolution API
docker logs evolution-api

# Logs do GestPlay
npm run dev
```

## Segurança

### Recomendações
1. Use HTTPS em produção
2. Configure autenticação na API
3. Valide todos os números de telefone
4. Implemente rate limiting
5. Monitore o uso da API

### Exemplo de Rate Limiting
```typescript
// Limite de 10 mensagens por minuto por cliente
const rateLimiter = new Map();

function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const clientLimit = rateLimiter.get(clientId) || [];
  
  // Remove mensagens antigas (mais de 1 minuto)
  const recentMessages = clientLimit.filter(
    (time: number) => now - time < 60000
  );
  
  if (recentMessages.length >= 10) {
    return false; // Rate limit exceeded
  }
  
  recentMessages.push(now);
  rateLimiter.set(clientId, recentMessages);
  return true;
}
```

## Próximos Passos

1. **Implementar Templates de Mensagem**
   - Criar templates personalizáveis
   - Suporte a variáveis dinâmicas
   - Prévia de mensagens

2. **Relatórios de Envio**
   - Status de entrega
   - Histórico de mensagens
   - Métricas de engajamento

3. **Automação Avançada**
   - Envio programado
   - Sequências de mensagens
   - Respostas automáticas

4. **Integração com Outros Canais**
   - SMS
   - Email
   - Telegram