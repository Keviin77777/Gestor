'use server';

/**
 * @fileOverview An AI-powered tool for generating smart renewal notifications for expiring clients and panels.
 *
 * - smartRenewalNotifications - A function that triggers the renewal notification process.
 * - SmartRenewalNotificationsInput - The input type for the smartRenewalNotifications function.
 * - SmartRenewalNotificationsOutput - The return type for the smartRenewalNotifications function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

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
  return smartRenewalNotificationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'smartRenewalNotificationsPrompt',
  input: {schema: SmartRenewalNotificationsInputSchema},
  output: {schema: SmartRenewalNotificationsOutputSchema},
  prompt: `You are an AI assistant that helps IPTV resellers manage their business by generating timely notifications about expiring client subscriptions and panels nearing renewal.

Generate concise and informative notifications based on the following data:

Expiring Clients:
{{#if clientsExpiringSoon}}
{{#each clientsExpiringSoon}}
- Client: {{clientName}} (ID: {{clientId}}), Plan: {{planName}}, Renewal Date: {{renewalDate}}
{{/each}}
{{else}}
- No clients expiring soon.
{{/if}}

Panels Nearing Renewal:
{{#if panelsNeedingRenewal}}
{{#each panelsNeedingRenewal}}
- Panel: {{panelName}} (ID: {{panelId}}), Renewal Date: {{renewalDate}}
{{/each}}
{{else}}
- No panels nearing renewal.
{{/if}}

Compose a list of notifications for the reseller, highlighting the clients and panels that require attention. Each notification should be clear and actionable.

Example Notifications:
- "Alert: Client John Doe's subscription for the Premium plan expires on 2024-07-15. Contact them to renew."
- "Urgent: Panel XUI-001 renewal is due on 2024-07-20. Ensure payment to avoid service disruption."

Output ONLY a JSON array of strings. Do NOT include any other text.
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
