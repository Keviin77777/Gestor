# 🎨 Landing Page com Planos Dinâmicos

## 📋 Visão Geral

A landing page do UltraGestor agora busca os planos **dinamicamente** do banco de dados. Qualquer alteração feita pelo admin na aba **Dashboard → Admin → Planos** será refletida automaticamente na landing page.

---

## 🔄 Como Funciona

### 1. **Admin Gerencia Planos**
- Acesse: `Dashboard → Admin → Planos`
- Crie, edite ou desative planos
- Defina: nome, descrição, preço, duração e status (ativo/inativo)

### 2. **API Pública Retorna Planos Ativos**
- Endpoint: `/api/public-plans`
- Backend PHP: `api/resources/public-plans.php`
- Retorna apenas planos com `is_active = 1`
- Ordenados: Trial primeiro, depois por duração

### 3. **Landing Page Exibe Dinamicamente**
- Busca planos ao carregar a página
- Calcula automaticamente:
  - Preço por mês (para planos longos)
  - Badge "Teste Grátis" para trial
  - Badge "Mais Popular" para plano mensal
  - Grid responsivo (2, 3 ou 4 colunas)

---

## 📁 Arquivos Criados/Modificados

### Novos Arquivos

1. **`src/app/api/public-plans/route.ts`**
   - API Route do Next.js
   - Faz proxy para API PHP
   - Adiciona logs para debug
   - Retorna fallback em caso de erro

2. **`api/resources/public-plans.php`**
   - Endpoint público (sem autenticação)
   - Busca planos ativos do banco
   - Retorna JSON formatado

### Arquivos Modificados

1. **`src/app/page.tsx`**
   - Busca planos dinamicamente
   - Renderiza baseado nos dados da API
   - Fallback com planos padrão
   - Loading state com spinner

---

## 🎯 Funcionalidades

### Detecção Automática

- **Trial**: Detectado por `is_trial = true`
  - Badge verde "Teste Grátis"
  - Botão verde "Começar teste grátis"
  - Features específicas para trial

- **Mais Popular**: Plano mensal (30 dias)
  - Badge azul/roxo "Mais Popular"
  - Escala maior (scale-105)
  - Destaque visual

- **Outros Planos**: Semestral, Anual, etc.
  - Calcula preço por mês automaticamente
  - Exibe economia

### Grid Responsivo

```typescript
// Adapta automaticamente ao número de planos
${plans.length === 4 ? 'md:grid-cols-2 lg:grid-cols-4' : 
  plans.length === 3 ? 'md:grid-cols-3' : 
  'md:grid-cols-2'}
```

---

## 🔧 Como Testar

### 1. Verificar Planos no Banco

```sql
SELECT * FROM reseller_subscription_plans WHERE is_active = 1;
```

### 2. Testar API PHP Diretamente

```bash
curl http://localhost:8080/resources/public-plans.php
```

Resposta esperada:
```json
{
  "success": true,
  "plans": [
    {
      "id": "plan_trial",
      "name": "Trial 3 Dias",
      "description": "Período de teste gratuito de 3 dias",
      "price": 0,
      "duration_days": 3,
      "is_trial": true
    },
    {
      "id": "plan_monthly",
      "name": "Plano Mensal",
      "description": "Acesso completo por 30 dias",
      "price": 39.9,
      "duration_days": 30,
      "is_trial": false
    }
  ]
}
```

### 3. Testar API Next.js

```bash
curl http://localhost:9002/api/public-plans
```

### 4. Verificar Landing Page

1. Acesse: `http://localhost:9002`
2. Role até a seção "Planos"
3. Verifique se os planos aparecem
4. Abra o console do navegador para ver logs

---

## 🎨 Personalização

### Alterar Plano "Mais Popular"

Edite em `src/app/page.tsx`:

```typescript
const isPopular = !isTrial && plan.duration_days === 30; // Mensal

// Ou use outro critério:
const isPopular = !isTrial && plan.id === 'plan_semester'; // Semestral
```

### Alterar Features dos Planos

Edite em `src/app/page.tsx`:

```typescript
const features = isTrial
  ? [
      'Acesso completo',
      'Todos os recursos',
      // ... adicione mais
    ]
  : [
      'Acesso completo',
      'Clientes ilimitados',
      // ... adicione mais
    ];
```

### Adicionar Novo Plano

1. Acesse: `Dashboard → Admin → Planos`
2. Clique em "Novo Plano"
3. Preencha os dados
4. Marque como "Ativo"
5. Salve

**A landing page será atualizada automaticamente!**

---

## 🐛 Troubleshooting

### Planos não aparecem na landing page

1. **Verificar se API PHP está rodando**
   ```bash
   curl http://localhost:8080/resources/public-plans.php
   ```

2. **Verificar se há planos ativos no banco**
   ```sql
   SELECT * FROM reseller_subscription_plans WHERE is_active = 1;
   ```

3. **Verificar logs do Next.js**
   - Abra o console do navegador
   - Procure por erros em "Erro ao buscar planos"

4. **Verificar logs da API**
   - Terminal do Next.js mostra logs da API Route
   - Procure por "🔍 Buscando planos de:"

### Fallback está sendo usado

Se você vê os planos padrão (Trial, Mensal, Semestral, Anual) mesmo após alterar no admin:

1. A API PHP pode não estar respondendo
2. Verifique se o servidor PHP está rodando na porta 8080
3. Verifique a variável `NEXT_PUBLIC_PHP_API_URL` no `.env`

---

## 📊 Fluxo de Dados

```
┌─────────────────────────────────────────────────────────┐
│  Admin altera planos no Dashboard                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
            ┌────────────────┐
            │  MySQL Database │
            │  reseller_      │
            │  subscription_  │
            │  plans          │
            └────────┬───────┘
                     │
                     ▼
        ┌────────────────────────┐
        │  api/resources/        │
        │  public-plans.php      │
        │  (Busca planos ativos) │
        └────────┬───────────────┘
                 │
                 ▼
    ┌────────────────────────────┐
    │  /api/public-plans         │
    │  (Next.js API Route)       │
    └────────┬───────────────────┘
             │
             ▼
┌────────────────────────────────┐
│  Landing Page (/)              │
│  - Renderiza planos            │
│  - Calcula preços              │
│  - Aplica badges               │
└────────────────────────────────┘
```

---

## ✅ Vantagens

1. **Centralizado**: Um único lugar para gerenciar planos
2. **Tempo Real**: Alterações refletem imediatamente
3. **Sem Deploy**: Não precisa fazer deploy para mudar preços
4. **Flexível**: Adicione quantos planos quiser
5. **Seguro**: API pública retorna apenas dados necessários
6. **Resiliente**: Fallback garante que landing page sempre funcione

---

## 🚀 Próximos Passos

- [ ] Adicionar cache na API (Redis/Memcached)
- [ ] Adicionar analytics de cliques por plano
- [ ] A/B testing de preços
- [ ] Cupons de desconto
- [ ] Planos promocionais temporários

---

**Desenvolvido com ❤️ para o UltraGestor**
