# Integração Sigma IPTV

## Visão Geral

A integração com o Sigma IPTV permite sincronizar clientes entre o sistema de gestão e o painel Sigma, automatizando processos de criação, renovação e gerenciamento de clientes.

## Funcionalidades Implementadas

### 1. Configuração de Servidor
- **3 campos obrigatórios**:
  - URL do Painel: `https://seupainel.top`
  - Usuário: username do revenda
  - Token: token de integração do Sigma

### 2. Teste de Conexão
- Validação automática das credenciais
- Busca automática do `userId` do revenda
- Feedback visual do status da conexão

### 3. Sincronização de Clientes
- **Criar Cliente**: Cria cliente no Sigma IPTV
- **Renovar Cliente**: Renova assinatura no Sigma
- **Sincronizar Status**: Atualiza status (ATIVO/INATIVO)
- **Excluir Cliente**: Remove cliente do Sigma

### 4. Indicadores Visuais
- Badge "Sigma" para clientes sincronizados
- Status de conexão na tabela de servidores
- Botões contextuais baseados no status de sincronização

## Fluxo de Uso

### 1. Configurar Servidor
1. Acesse **Dashboard > Servidores**
2. Clique em **Novo Servidor**
3. Preencha os dados básicos do servidor
4. Na seção **Integração Sigma IPTV**:
   - URL do Painel: `https://seupainel.top`
   - Usuário: seu username de revenda
   - Token: token fornecido pelo Sigma
5. Clique em **Testar Conexão**
6. Se conectado com sucesso, clique em **Adicionar Servidor**

### 2. Gerenciar Clientes
1. Acesse **Dashboard > Clientes**
2. Para clientes com servidor Sigma configurado:
   - **Criar no Sigma**: Botão disponível se cliente tem credenciais
   - **Renovar no Sigma**: Disponível no menu "Mais"
   - **Sincronizar Status**: Disponível no menu "Mais"

## API Endpoints

### POST `/api/sigma/test-connection`
Testa conexão com o Sigma IPTV
```json
{
  "url": "https://seupainel.top",
  "username": "usuario",
  "token": "token123"
}
```

### POST `/api/sigma/sync-client`
Sincroniza cliente com o Sigma
```json
{
  "sigmaConfig": {
    "url": "https://seupainel.top",
    "username": "usuario", 
    "token": "token123",
    "userId": "userId123"
  },
  "action": "create|renew|status|delete|get",
  "clientData": {
    "username": "cliente123",
    "password": "senha123",
    "name": "Nome Cliente",
    "packageId": "pacote123"
  }
}
```

### POST `/api/sigma/packages`
Busca pacotes disponíveis no Sigma
```json
{
  "url": "https://seupainel.top",
  "username": "usuario",
  "token": "token123"
}
```

## Estrutura de Dados

### Panel (atualizado)
```typescript
type Panel = {
  // ... campos existentes
  sigmaUrl?: string;
  sigmaUsername?: string;
  sigmaToken?: string;
  sigmaUserId?: string;
  sigmaConnected?: boolean;
  sigmaLastSync?: string;
}
```

## Arquivos Modificados/Criados

### Novos Arquivos
- `src/lib/sigma-api.ts` - Cliente da API Sigma
- `src/hooks/use-sigma-integration.ts` - Hook para integração
- `src/app/api/sigma/test-connection/route.ts` - API teste conexão
- `src/app/api/sigma/sync-client/route.ts` - API sincronização
- `src/app/api/sigma/packages/route.ts` - API pacotes
- `src/components/sigma-test.tsx` - Componente de teste

### Arquivos Modificados
- `src/lib/definitions.ts` - Adicionados campos Sigma ao Panel
- `src/app/(app)/dashboard/servers/page.tsx` - Formulário com campos Sigma
- `src/components/clients/client-table.tsx` - Ações de sincronização

## Segurança

- Tokens são armazenados de forma segura no Firestore
- Validação de entrada em todas as APIs
- Tratamento de erros robusto
- Logs de erro para debugging

## Próximos Passos

1. **Sincronização Automática**: Implementar webhook para sincronização bidirecional
2. **Logs de Sincronização**: Histórico de operações Sigma
3. **Bulk Operations**: Sincronizar múltiplos clientes
4. **Monitoramento**: Dashboard de status das integrações