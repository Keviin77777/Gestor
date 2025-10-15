# Templates de WhatsApp para Administradores

## Visão Geral

O sistema agora suporta dois tipos de templates de WhatsApp:

1. **Templates para Clientes** - Mensagens enviadas aos clientes finais (usuários do sistema)
2. **Templates para Revendedores** - Mensagens enviadas aos revendedores (apenas para ADMIN)

## Estrutura do Banco de Dados

### Tabela: `whatsapp_templates`
Armazena templates para enviar mensagens aos **clientes**.

### Tabela: `reseller_whatsapp_templates`
Armazena templates para enviar mensagens aos **revendedores** (apenas ADMIN).

Campos principais:
- `trigger_type`: Tipo de gatilho (expiring_7days, expiring_3days, expiring_1day, expired, payment_confirmed, welcome)
- `message`: Mensagem do template
- `is_active`: Se o template está ativo

## Templates Padrão para Revendedores

Os seguintes templates são criados automaticamente para o ADMIN:

1. **Assinatura vence em 7 dias** (`expiring_7days`)
2. **Assinatura vence em 3 dias** (`expiring_3days`)
3. **Assinatura vence AMANHÃ** (`expiring_1day`)
4. **Assinatura VENCIDA** (`expired`)
5. **Pagamento Confirmado** (`payment_confirmed`)
6. **Boas-vindas Revenda** (`welcome`)

## Variáveis Disponíveis nos Templates de Revendedores

- `{{revenda_nome}}` - Nome do revendedor
- `{{revenda_email}}` - Email do revendedor
- `{{plano_nome}}` - Nome do plano de assinatura
- `{{valor}}` - Valor da assinatura
- `{{data_vencimento}}` - Data de vencimento da assinatura
- `{{link_renovacao}}` - Link para renovação da assinatura

## Como Funciona

### Para Usuários ADMIN

Quando um usuário com `is_admin = TRUE` acessa a página de templates (`/dashboard/whatsapp/templates`):

1. A API verifica se o usuário é ADMIN
2. Se for ADMIN, busca templates de AMBAS as tabelas:
   - `whatsapp_templates` (templates para clientes)
   - `reseller_whatsapp_templates` (templates para revendedores)
3. Os templates são marcados com `template_category`:
   - `'client'` - Templates para clientes
   - `'reseller'` - Templates para revendedores

### Para Usuários Normais (Revendedores)

Usuários normais veem apenas seus próprios templates da tabela `whatsapp_templates`.

## Interface do Usuário

### Indicadores Visuais

- Templates de revendedores exibem uma badge **ADMIN** laranja
- Filtro adicional permite filtrar por categoria:
  - "Para Clientes"
  - "Para Revendedores (ADMIN)"

### Estatísticas

O dashboard mostra:
- Total de templates
- Templates ativos
- Templates para clientes
- Templates para revendedores (apenas ADMIN)
- Templates personalizados

## Arquivos Modificados

### Backend (PHP)
- `api/resources/whatsapp-reminder-templates.php` - Adicionada lógica para buscar templates de revendedores quando usuário é ADMIN

### Frontend (TypeScript/React)
- `src/hooks/use-templates.ts` - Atualizada interface para incluir `template_category`
- `src/app/(app)/dashboard/whatsapp/templates/page.tsx` - Adicionados filtros e indicadores visuais

### Banco de Dados
- `database/migrations/007_admin_and_reseller_whatsapp.sql` - Criação da tabela `reseller_whatsapp_templates`

## Exemplo de Uso

### Verificar se Usuário é Admin (PHP)
```php
$stmt = $conn->prepare("SELECT is_admin FROM resellers WHERE id = ?");
$stmt->execute([$reseller_id]);
$userData = $stmt->fetch(PDO::FETCH_ASSOC);
$is_admin = $userData && $userData['is_admin'];
```

### Buscar Templates de Revendedores (PHP)
```php
if ($is_admin) {
    $stmt = $conn->prepare("
        SELECT * FROM reseller_whatsapp_templates
        WHERE is_active = TRUE
    ");
    $stmt->execute();
    $resellerTemplates = $stmt->fetchAll(PDO::FETCH_ASSOC);
}
```

### Filtrar Templates no Frontend (TypeScript)
```typescript
const resellerTemplates = templates.filter(t => t.template_category === 'reseller');
const clientTemplates = templates.filter(t => t.template_category === 'client');
```

## Próximos Passos

1. Implementar processador automático para enviar mensagens aos revendedores quando suas assinaturas estiverem expirando
2. Adicionar histórico de mensagens enviadas aos revendedores
3. Criar interface para ADMIN gerenciar templates de revendedores (criar, editar, deletar)

## Notas Importantes

- Apenas usuários com `is_admin = TRUE` podem ver templates de revendedores
- Templates de revendedores são compartilhados entre todos os revendedores (não são específicos por revendedor)
- Templates padrão de revendedores são criados automaticamente na migração 007
