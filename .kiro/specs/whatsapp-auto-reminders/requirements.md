# Sistema de Lembretes Automáticos de Vencimento via WhatsApp

## Introdução

Este sistema permitirá aos usuários configurar lembretes automáticos personalizados que serão enviados via WhatsApp para clientes em diferentes momentos relacionados ao vencimento de suas mensalidades. O usuário poderá criar múltiplos templates de lembrete com diferentes configurações de dias, permitindo uma comunicação proativa e automatizada com os clientes.

## Requisitos

### Requisito 1: Configuração de Templates de Lembrete

**User Story:** Como um revendedor, eu quero criar templates de lembrete personalizados com diferentes configurações de dias, para que eu possa automatizar a comunicação com meus clientes sobre vencimentos.

#### Acceptance Criteria

1. WHEN o usuário acessa a seção de templates de WhatsApp THEN o sistema SHALL exibir uma opção para criar "Lembretes de Vencimento"
2. WHEN o usuário cria um novo template de lembrete THEN o sistema SHALL permitir configurar:
   - Nome do template
   - Mensagem personalizada com variáveis dinâmicas
   - Tipo de lembrete (antes do vencimento, no vencimento, após vencimento)
   - Quantidade de dias (ex: 7 dias antes, 2 dias depois)
   - Status ativo/inativo
3. WHEN o usuário salva um template THEN o sistema SHALL validar que todos os campos obrigatórios estão preenchidos
4. WHEN o usuário edita um template existente THEN o sistema SHALL permitir modificar todas as configurações
5. WHEN o usuário exclui um template THEN o sistema SHALL solicitar confirmação antes da exclusão

### Requisito 2: Variáveis Dinâmicas nos Templates

**User Story:** Como um revendedor, eu quero usar variáveis dinâmicas nos meus templates de lembrete, para que as mensagens sejam personalizadas automaticamente com os dados do cliente.

#### Acceptance Criteria

1. WHEN o usuário cria uma mensagem de template THEN o sistema SHALL disponibilizar as seguintes variáveis:
   - {cliente_nome} - Nome do cliente
   - {data_vencimento} - Data de vencimento formatada
   - {dias_restantes} - Quantidade de dias até o vencimento
   - {valor} - Valor da mensalidade
   - {plano} - Nome do plano do cliente
2. WHEN o usuário digita uma variável THEN o sistema SHALL mostrar sugestões automáticas
3. WHEN uma mensagem é enviada THEN o sistema SHALL substituir todas as variáveis pelos valores reais do cliente
4. IF uma variável não possui valor THEN o sistema SHALL substituir por um texto padrão ou remover a variável

### Requisito 3: Configuração de Múltiplos Lembretes

**User Story:** Como um revendedor, eu quero configurar múltiplos lembretes para diferentes momentos, para que eu possa manter uma comunicação constante com meus clientes sobre vencimentos.

#### Acceptance Criteria

1. WHEN o usuário acessa as configurações de lembretes THEN o sistema SHALL permitir criar múltiplos templates do tipo:
   - Lembretes antes do vencimento (ex: 10d, 7d, 3d, 1d antes)
   - Lembrete no dia do vencimento
   - Lembretes após vencimento (ex: 1d, 3d, 7d depois)
2. WHEN o usuário configura dias antes do vencimento THEN o sistema SHALL aceitar valores de 1 a 30 dias
3. WHEN o usuário configura dias após vencimento THEN o sistema SHALL aceitar valores de 1 a 15 dias
4. WHEN existem múltiplos templates para o mesmo período THEN o sistema SHALL permitir definir prioridade ou ordem de envio
5. IF o usuário tenta criar um template duplicado (mesmo tipo e dias) THEN o sistema SHALL exibir aviso de conflito

### Requisito 4: Sistema de Envio Automático

**User Story:** Como um revendedor, eu quero que os lembretes sejam enviados automaticamente nos dias configurados, para que eu não precise me preocupar em enviar manualmente.

#### Acceptance Criteria

1. WHEN o sistema executa a verificação automática THEN o sistema SHALL verificar todos os clientes ativos
2. WHEN um cliente atende aos critérios de um template de lembrete THEN o sistema SHALL enviar a mensagem automaticamente
3. WHEN uma mensagem é enviada THEN o sistema SHALL registrar o log do envio com:
   - Data e hora do envio
   - Cliente destinatário
   - Template utilizado
   - Status do envio (sucesso/erro)
4. WHEN um cliente já recebeu um lembrete específico THEN o sistema SHALL evitar envios duplicados no mesmo dia
5. IF o envio falhar THEN o sistema SHALL tentar reenviar até 3 vezes com intervalo de 30 minutos

### Requisito 5: Controle de Histórico e Logs

**User Story:** Como um revendedor, eu quero visualizar o histórico de lembretes enviados, para que eu possa acompanhar a comunicação com meus clientes.

#### Acceptance Criteria

1. WHEN o usuário acessa o histórico de lembretes THEN o sistema SHALL exibir uma lista com:
   - Data e hora do envio
   - Nome do cliente
   - Tipo de lembrete enviado
   - Status do envio
   - Conteúdo da mensagem
2. WHEN o usuário filtra o histórico THEN o sistema SHALL permitir filtrar por:
   - Período de datas
   - Cliente específico
   - Tipo de lembrete
   - Status do envio
3. WHEN o usuário visualiza detalhes de um envio THEN o sistema SHALL mostrar informações completas incluindo possíveis erros
4. WHEN o sistema detecta falhas recorrentes THEN o sistema SHALL alertar o usuário sobre problemas de conectividade

### Requisito 6: Configurações Globais de Lembretes

**User Story:** Como um revendedor, eu quero ter controle global sobre o sistema de lembretes, para que eu possa ativar/desativar ou configurar horários de envio.

#### Acceptance Criteria

1. WHEN o usuário acessa configurações globais THEN o sistema SHALL permitir:
   - Ativar/desativar sistema de lembretes completamente
   - Definir horário de funcionamento (ex: 8h às 18h)
   - Configurar dias da semana para envio
   - Definir intervalo mínimo entre verificações
2. WHEN o sistema está fora do horário configurado THEN o sistema SHALL aguardar o próximo horário válido
3. WHEN o usuário desativa um template THEN o sistema SHALL parar de enviar lembretes desse tipo
4. IF não há conexão com WhatsApp THEN o sistema SHALL pausar envios e tentar reconectar automaticamente

### Requisito 7: Integração com Sistema Existente

**User Story:** Como desenvolvedor, eu quero que o sistema de lembretes se integre perfeitamente com o sistema existente de geração de faturas, para que funcione de forma harmoniosa.

#### Acceptance Criteria

1. WHEN uma fatura é gerada automaticamente THEN o sistema SHALL verificar se há lembretes configurados para o cliente
2. WHEN um cliente paga uma fatura THEN o sistema SHALL cancelar lembretes pendentes relacionados àquela data
3. WHEN a data de renovação de um cliente é alterada THEN o sistema SHALL recalcular os lembretes pendentes
4. WHEN um cliente é desativado THEN o sistema SHALL cancelar todos os lembretes pendentes
5. IF há conflito entre geração de fatura e lembrete THEN o sistema SHALL priorizar a geração de fatura

### Requisito 8: Interface de Usuário Intuitiva

**User Story:** Como um revendedor, eu quero uma interface simples e intuitiva para gerenciar meus lembretes, para que eu possa configurar facilmente sem conhecimento técnico.

#### Acceptance Criteria

1. WHEN o usuário acessa a seção de lembretes THEN o sistema SHALL exibir uma interface clara com:
   - Lista de templates existentes
   - Botão para criar novo template
   - Status de cada template (ativo/inativo)
   - Estatísticas de envios recentes
2. WHEN o usuário cria um template THEN o sistema SHALL fornecer:
   - Preview da mensagem com variáveis substituídas
   - Validação em tempo real dos campos
   - Sugestões de melhores práticas
3. WHEN o usuário visualiza estatísticas THEN o sistema SHALL mostrar:
   - Total de lembretes enviados no mês
   - Taxa de sucesso de envios
   - Templates mais utilizados
   - Clientes que mais recebem lembretes