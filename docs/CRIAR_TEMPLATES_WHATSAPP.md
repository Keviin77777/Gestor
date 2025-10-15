# 📝 Como Criar Templates do WhatsApp

## 🎯 Problema Atual

O sistema está usando a mensagem padrão (fallback) ao invés dos templates personalizados do banco de dados.

## 🔍 Verificar se Existem Templates

### Opção 1: Via Frontend
1. Acesse **WhatsApp > Templates**
2. Verifique se há templates do tipo **"invoice"**
3. Verifique se estão **ativos** (toggle verde)

### Opção 2: Via Script
```bash
# 1. Obter token
# Abra o console do navegador (F12) e execute:
localStorage.getItem('token')

# 2. Editar o script
# Abra test-templates-api.js e cole o token

# 3. Executar
node test-templates-api.js
```

## ✅ Criar Template de Fatura

### 1. Acessar Templates
- Vá em **WhatsApp > Templates**
- Clique em **"Novo Template"**

### 2. Preencher Dados

**Nome:** Cobrança Mensal

**Tipo:** invoice

**Trigger:** invoice_generated

**Ativo:** ✅ Sim

**Mensagem:**
```
💳 *Link de Pagamento*

Olá {{cliente_nome}}!

Sua fatura está disponível:

💰 Valor: R$ {{valor}}
📋 Referente: {{referencia}}
📅 Vencimento: {{data_vencimento}}

🔗 *Pagar agora:*
{{link_pagamento}}

Pague com PIX, Cartão ou Boleto! 🚀

_Mensagem automática do sistema GestPlay_
```

### 3. Salvar
Clique em **"Salvar Template"**

## 📋 Variáveis Disponíveis

### Cliente
- `{{cliente_nome}}` - Nome do cliente
- `{{cliente_usuario}}` - Username
- `{{cliente_telefone}}` - Telefone

### Fatura
- `{{valor}}` - Valor formatado (ex: 49,90)
- `{{valor_numerico}}` - Valor numérico (ex: 49.90)
- `{{data_vencimento}}` - Data de vencimento
- `{{referencia}}` - Descrição da fatura
- `{{link_pagamento}}` - Link para pagamento
- `{{link_fatura}}` - Mesmo que link_pagamento

### Plano
- `{{plano}}` - Nome do plano
- `{{plano_nome}}` - Nome do plano

### Sistema
- `{{data_atual}}` - Data atual
- `{{hora_atual}}` - Hora atual
- `{{empresa_nome}}` - Nome da empresa

## 🧪 Testar Template

### 1. Verificar no Console
Ao gerar uma fatura, verifique os logs no console (F12):

```
🔍 Buscando template de fatura...
📡 Resposta da API: 200 OK
📋 Templates recebidos: 1 [...]
🎯 Template selecionado: Cobrança Mensal
📝 Template encontrado: {...}
✅ Usando template de fatura do banco de dados: Cobrança Mensal
📝 Mensagem processada: 💳 *Link de Pagamento*...
```

### 2. Verificar Mensagem Enviada
A mensagem deve usar o template personalizado, não o fallback.

## 🐛 Troubleshooting

### Problema: "Nenhum template encontrado"

**Causa:** Não há templates do tipo "invoice" ativos

**Solução:**
1. Criar template conforme instruções acima
2. Marcar como ativo
3. Testar novamente

### Problema: "Usando mensagem padrão (fallback)"

**Causa:** Template não foi encontrado ou erro ao buscar

**Solução:**
1. Verificar logs no console
2. Verificar se API retorna templates
3. Verificar se template está ativo
4. Recarregar página (F5)

### Problema: Variáveis não são substituídas

**Causa:** Nome da variável incorreto

**Solução:**
Use exatamente os nomes listados acima, com `{{` e `}}`

## 📝 Exemplos de Templates

### Template Simples
```
Olá {{cliente_nome}}!

Sua fatura de R$ {{valor}} vence em {{data_vencimento}}.

Pague em: {{link_pagamento}}
```

### Template Completo
```
💳 *Nova Fatura - {{plano}}*

Olá {{cliente_nome}}! 👋

📋 Detalhes da fatura:
• Valor: R$ {{valor}}
• Vencimento: {{data_vencimento}}
• Referência: {{referencia}}

🔗 *Pagar agora:*
{{link_pagamento}}

💡 Formas de pagamento:
✅ PIX (aprovação instantânea)
✅ Cartão de Crédito
✅ Boleto Bancário

Dúvidas? Entre em contato!

_Mensagem automática - {{empresa_nome}}_
```

### Template com Emojis
```
🎯 *Fatura Disponível*

Oi {{cliente_nome}}! 😊

Sua mensalidade está pronta:

💰 Valor: R$ {{valor}}
📅 Vence: {{data_vencimento}}
📦 Plano: {{plano}}

👉 Pague aqui: {{link_pagamento}}

Obrigado pela preferência! 🙏

_{{empresa_nome}}_
```

## ✅ Checklist

- [ ] Template criado no frontend
- [ ] Tipo definido como "invoice"
- [ ] Template marcado como ativo
- [ ] Variáveis corretas (com `{{` e `}}`)
- [ ] Testado gerando uma fatura
- [ ] Mensagem recebida com template personalizado

---

**Depois de criar o template, recarregue o frontend e teste novamente!** 🚀
