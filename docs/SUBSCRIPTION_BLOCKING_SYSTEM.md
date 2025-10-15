# 🔒 Sistema de Bloqueio por Assinatura

## Visão Geral

O sistema implementa um bloqueio **COMPLETO** de todos os serviços quando a assinatura do reseller expira. Nenhum serviço funcionará até que a assinatura seja renovada.

---

## 🎯 Regras de Bloqueio

### ✅ **Admins (is_admin = 1)**
- **NUNCA são bloqueados**
- Têm acesso total independente de assinatura
- Não verificam `subscription_expiry_date`

### 🚫 **Resellers (is_admin = 0)**
São bloqueados quando:

1. **Conta desativada**: `is_active = 0`
2. **Assinatura expirada**: `subscription_expiry_date < hoje` ou `NULL`
3. **Status inativo**: `account_status != 'active'` **E** `!= 'trial'`

**Nota**: Contas em período de trial (`account_status = 'trial'`) funcionam normalmente até a data de expiração.

---

## 🔧 Componentes com Bloqueio

### 1️⃣ **Frontend (React/Next.js)**

#### `src/components/subscription/subscription-guard.tsx`
- Bloqueia acesso a todas as páginas do dashboard
- Redireciona para página de renovação
- Mostra banner de aviso

#### `src/app/(app)/layout.tsx`
- Aplica o guard em todas as rotas protegidas
- Verifica assinatura em cada navegação

---

### 2️⃣ **Backend (PHP)**

#### `api/middleware/subscription-check.php`
- Middleware aplicado em TODAS as APIs
- Retorna erro 403 se assinatura expirada
- Bloqueia:
  - Clientes
  - Faturas
  - Lembretes
  - WhatsApp
  - Painéis
  - Relatórios

#### Exemplo de uso:
```php
require_once __DIR__ . '/../middleware/subscription-check.php';

// Verificar assinatura
$subscriptionCheck = checkResellerSubscription($resellerId, $pdo);
if (!$subscriptionCheck['active']) {
    http_response_code(403);
    echo json_encode([
        'error' => 'Assinatura expirada',
        'message' => $subscriptionCheck['message']
    ]);
    exit;
}
```

---

### 3️⃣ **Processors (Node.js)**

#### `scripts/reminder-processor.js`
**Função**: Enviar lembretes WhatsApp automaticamente

**Verificação**:
```javascript
const [resellerData] = await pool.query(
  `SELECT is_admin, subscription_expiry_date, account_status 
   FROM resellers WHERE id = ?`,
  [resellerId]
);

if (!resellerInfo.is_admin) {
  const expiryDate = resellerInfo.subscription_expiry_date;
  const today = new Date().toISOString().split('T')[0];

  if (!expiryDate || expiryDate < today) {
    console.log(`🚫 Assinatura expirada, pulando processamento`);
    continue;
  }

  if (resellerInfo.account_status !== 'active' && resellerInfo.account_status !== 'trial') {
    console.log(`🚫 Conta inativa, pulando processamento`);
    continue;
  }
}
```

**Resultado**: Lembretes NÃO são enviados se assinatura expirada

---

#### `scripts/invoice-processor.js`
**Função**: Gerar faturas automaticamente

**Verificação**: Mesma lógica do reminder-processor

**Resultado**: Faturas NÃO são geradas se assinatura expirada

---

#### `scripts/whatsapp-connection-monitor.js`
**Função**: Monitorar conexões WhatsApp e reprocessar lembretes

**Verificação**:
```javascript
const [resellers] = await pool.query(
  `SELECT DISTINCT wrs.reseller_id, r.is_admin, 
          r.subscription_expiry_date, r.account_status
   FROM whatsapp_reminder_settings wrs
   JOIN resellers r ON wrs.reseller_id = r.id
   WHERE wrs.is_enabled = 1 AND r.is_active = 1`
);

for (const reseller of resellers) {
  if (!reseller.is_admin) {
    const expiryDate = reseller.subscription_expiry_date;
    const today = new Date().toISOString().split('T')[0];

    if (!expiryDate || expiryDate < today) {
      continue; // Pular monitoramento
    }

    if (reseller.account_status !== 'active' && reseller.account_status !== 'trial') {
      continue; // Pular monitoramento
    }
  }
  // ... continuar monitoramento
}
```

**Resultado**: Conexões NÃO são monitoradas se assinatura expirada

---

#### `scripts/subscription-processor.js`
**Função**: Processar pagamentos de assinatura

**Verificação**: NÃO precisa verificar (processa pagamentos para renovar)

---

## 🧪 Testando o Bloqueio

### Script de Teste
```bash
node scripts/test-subscription-block.js
```

Este script verifica:
- ✅ Quais resellers estão bloqueados
- ✅ Motivo do bloqueio
- ✅ Clientes ativos
- ✅ Lembretes pendentes
- ✅ Faturas pendentes

### Exemplo de Saída:
```
👤 Reseller: revenda@exemplo.com (ID: reseller_123)
   Tipo: 👥 RESELLER
   Status da conta: active
   Ativo: SIM
   Assinatura expira: 2025-01-01
   🚫 BLOQUEADO: Assinatura expirada (2025-01-01)
   ⚠️  Nenhum serviço funcionará para este reseller
   👥 Clientes ativos: 50
   📝 Lembretes pendentes hoje: 10
   💰 Faturas pendentes: 25
```

---

## 📊 Fluxo de Bloqueio

```
┌─────────────────────────────────────────────────────────┐
│  Reseller tenta acessar qualquer serviço                │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
            ┌────────────────┐
            │  É Admin?      │
            └────────┬───────┘
                     │
         ┌───────────┴───────────┐
         │                       │
        SIM                     NÃO
         │                       │
         ▼                       ▼
    ✅ LIBERADO        ┌──────────────────┐
                       │ Assinatura OK?   │
                       └────────┬─────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                   SIM                     NÃO
                    │                       │
                    ▼                       ▼
            ┌──────────────┐         🚫 BLOQUEADO
            │ Conta ativa? │         • Dashboard
            └──────┬───────┘         • APIs
                   │                 • Lembretes
       ┌───────────┴───────────┐     • Faturas
       │                       │     • Monitor
      SIM                     NÃO
       │                       │
       ▼                       ▼
  ✅ LIBERADO           🚫 BLOQUEADO
```

---

## 🔄 Renovação de Assinatura

### Quando o reseller renova:

1. **Webhook recebe pagamento aprovado**
   - `api/webhooks/mercadopago.php`
   - `api/webhooks/asaas.php`

2. **Atualiza assinatura**
   ```php
   // Se expirado, começa de hoje
   if ($currentExpiry < $today) {
       $newExpiry = date('Y-m-d', strtotime("+{$days} days"));
   } else {
       // Se não expirado, adiciona ao vencimento atual
       $newExpiry = date('Y-m-d', strtotime($currentExpiry . " +{$days} days"));
   }
   ```

3. **Serviços são desbloqueados automaticamente**
   - Frontend: Próxima verificação libera acesso
   - Backend: Próxima requisição passa no middleware
   - Processors: Próximo ciclo processa normalmente

---

## ⚠️ Importante

### O que NÃO funciona quando expirado:
- ❌ Acesso ao dashboard
- ❌ Visualizar/editar clientes
- ❌ Gerar faturas
- ❌ Enviar lembretes WhatsApp
- ❌ Criar/editar painéis
- ❌ Visualizar relatórios
- ❌ Configurar métodos de pagamento
- ❌ Gerenciar templates WhatsApp

### O que CONTINUA funcionando:
- ✅ Página de renovação de assinatura
- ✅ Processamento de pagamentos (webhooks)
- ✅ Página de checkout PIX
- ✅ Login/Logout

---

## 🛠️ Manutenção

### Adicionar bloqueio em novo serviço:

1. **Frontend (React)**:
   ```tsx
   import { SubscriptionGuard } from '@/components/subscription/subscription-guard';
   
   export default function NovaPage() {
     return (
       <SubscriptionGuard>
         {/* Conteúdo da página */}
       </SubscriptionGuard>
     );
   }
   ```

2. **Backend (PHP)**:
   ```php
   require_once __DIR__ . '/../middleware/subscription-check.php';
   
   $subscriptionCheck = checkResellerSubscription($resellerId, $pdo);
   if (!$subscriptionCheck['active']) {
       http_response_code(403);
       echo json_encode(['error' => 'Assinatura expirada']);
       exit;
   }
   ```

3. **Processor (Node.js)**:
   ```javascript
   const [resellerData] = await pool.query(
     `SELECT is_admin, subscription_expiry_date, account_status 
      FROM resellers WHERE id = ?`,
     [resellerId]
   );
   
   if (!resellerData[0].is_admin) {
     const expiryDate = resellerData[0].subscription_expiry_date;
     const today = new Date().toISOString().split('T')[0];
     
     if (!expiryDate || expiryDate < today) {
       console.log('🚫 Assinatura expirada, pulando');
       continue;
     }
     
     if (resellerData[0].account_status !== 'active' && resellerData[0].account_status !== 'trial') {
       console.log('🚫 Conta inativa, pulando');
       continue;
     }
   }
   ```

---

## 📝 Logs

### Processors mostram claramente quando bloqueiam:
```
🚫 Reseller reseller_123 (revenda@exemplo.com): Assinatura expirada (2025-01-01), pulando processamento
🚫 Reseller reseller_456 (teste@exemplo.com): Conta inativa (suspended), pulando processamento
```

### Frontend mostra banner:
```
⚠️ Sua assinatura expirou em 01/01/2025
Renove agora para continuar usando o sistema
[Renovar Assinatura]
```

---

## ✅ Checklist de Implementação

- [x] Frontend: SubscriptionGuard
- [x] Frontend: Layout com guard
- [x] Backend: Middleware subscription-check.php
- [x] Backend: Aplicado em todas as APIs
- [x] Processor: reminder-processor.js
- [x] Processor: invoice-processor.js
- [x] Processor: whatsapp-connection-monitor.js
- [x] Webhooks: Renovação automática
- [x] Testes: Script de verificação
- [x] Documentação: Este arquivo

---

## 🎉 Conclusão

O sistema está **100% protegido**. Quando a assinatura expira:
- ✅ Nenhum serviço funciona
- ✅ Nenhum lembrete é enviado
- ✅ Nenhuma fatura é gerada
- ✅ Nenhuma API responde
- ✅ Dashboard é bloqueado

**Apenas a renovação da assinatura desbloqueia tudo automaticamente!**
