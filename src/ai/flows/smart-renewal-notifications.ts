'use server';

/**
 * @fileOverview An AI-powered tool for generating smart renewal notifications for expiring clients and panels.
 *
 * - smartRenewalNotifications - A function that triggers the renewal notification process.
 * - SmartRenewalNotificationsInput - The input type for the smartRenewalNotifications function.
 * - SmartRenewalNotificationsOutput - The return type for the smartRenewalNotifications function.
 */

import {ai, hasGemini} from '@/ai/genkit';
import {z} from 'genkit';
import { useClients } from '@/hooks/use-clients';
import { usePlans } from '@/hooks/use-plans';

const SmartRenewalNotificationsInputSchema = z.object({
  clientsExpiringSoon: z.array(
    z.object({
      clientId: z.string().describe('The ID of the client.'),
      clientName: z.string().describe('The name of the client.'),
      renewalDate: z.string().describe('The renewal date of the client.'),
      planName: z.string().describe('The name of the client plan.'),
    })
  ).describe('List of clients with subscriptions expiring soon.'),
  panelsNeedingRenewal: z.array(
    z.object({
      panelId: z.string().describe('The ID of the panel.'),
      panelName: z.string().describe('The name of the panel.'),
      renewalDate: z.string().describe('The renewal date of the panel.'),
    })
  ).describe('List of panels nearing renewal.'),
});
export type SmartRenewalNotificationsInput = z.infer<typeof SmartRenewalNotificationsInputSchema>;

const SmartRenewalNotificationsOutputSchema = z.object({
  notifications: z.array(
    z.string().describe('A notification message for the reseller.')
  ).describe('List of notification messages.'),
});
export type SmartRenewalNotificationsOutput = z.infer<typeof SmartRenewalNotificationsOutputSchema>;

export async function smartRenewalNotifications(input: SmartRenewalNotificationsInput): Promise<SmartRenewalNotificationsOutput> {
  if (!hasGemini) {
    // Local deterministic fallback without AI when API key is missing
    const notifications: string[] = [];
    for (const c of input.clientsExpiringSoon) {
      notifications.push(
        `Alerta: A assinatura do cliente ${c.clientName} para o plano ${c.planName} expira em ${c.renewalDate}. Entre em contato para renovar.`
      );
    }
    for (const p of input.panelsNeedingRenewal) {
      notifications.push(
        `Aviso: A renovação do painel ${p.panelName} vence em ${p.renewalDate}. Garanta o pagamento.`
      );
    }
    return { notifications };
  }
  return smartRenewalNotificationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'smartRenewalNotificationsPrompt',
  input: {schema: SmartRenewalNotificationsInputSchema},
  output: {schema: SmartRenewalNotificationsOutputSchema},
  prompt: `Você é um assistente de IA que ajuda revendedores de IPTV a gerenciar seus negócios, gerando notificações oportunas sobre assinaturas de clientes expirando e painéis perto da renovação.

Gere notificações concisas e informativas com base nos seguintes dados:

Clientes Expirando em Breve:
{{#if clientsExpiringSoon}}
{{#each clientsExpiringSoon}}
- Cliente: {{clientName}} (ID: {{clientId}}), Plano: {{planName}}, Data de Renovação: {{renewalDate}}
{{/each}}
{{else}}
- Nenhum cliente expirando em breve.
{{/if}}

Painéis Precisando de Renovação:
{{#if panelsNeedingRenewal}}
{{#each panelsNeedingRenewal}}
- Painel: {{panelName}} (ID: {{panelId}}), Data de Renovação: {{renewalDate}}
{{/each}}
{{else}}
- Nenhum painel precisando de renovação.
{{/if}}

Componha uma lista de notificações para o revendedor, destacando os clientes e painéis que requerem atenção. Cada notificação deve ser clara e acionável.

Exemplos de Notificação:
- "Alerta: A assinatura do cliente João da Silva para o plano Premium expira em 2024-07-15. Entre em contato para renovar."
- "Urgente: A renovação do painel XUI-001 vence em 2024-07-20. Garanta o pagamento para evitar a interrupção do serviço."

Produza APENAS um array JSON de strings. NÃO inclua nenhum outro texto.
`,config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_LOW_AND_ABOVE',
      },
    ],
  },
});

const smartRenewalNotificationsFlow = ai.defineFlow(
  {
    name: 'smartRenewalNotificationsFlow',
    inputSchema: SmartRenewalNotificationsInputSchema,
    outputSchema: SmartRenewalNotificationsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
