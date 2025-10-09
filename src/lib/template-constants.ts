/**
 * Constantes e utilitários para o sistema de templates
 */

export const TEMPLATE_TYPES = {
  welcome: { label: 'Boas-vindas', icon: '🎉', color: 'purple' },
  invoice: { label: 'Fatura', icon: '💳', color: 'blue' },
  renewal: { label: 'Renovação', icon: '✅', color: 'green' },
  reminder_before: { label: 'Lembrete (Antes)', icon: '⏰', color: 'yellow' },
  reminder_due: { label: 'Vencimento', icon: '📅', color: 'orange' },
  reminder_after: { label: 'Lembrete (Após)', icon: '⚠️', color: 'red' },
  data_send: { label: 'Envio de Dados', icon: '📱', color: 'cyan' },
  payment_link: { label: 'Link Pagamento', icon: '🔗', color: 'indigo' },
  custom: { label: 'Personalizado', icon: '✨', color: 'gray' },
} as const;

export const TRIGGER_EVENTS = {
  user_created: { label: 'Usuário Criado', description: 'Quando um novo usuário é criado' },
  invoice_generated: { label: 'Fatura Gerada', description: 'Quando uma fatura é gerada' },
  invoice_paid: { label: 'Fatura Paga', description: 'Quando uma fatura é paga' },
  scheduled: { label: 'Agendado', description: 'Enviado em horário específico' },
  manual: { label: 'Manual', description: 'Enviado manualmente' },
} as const;

export const AVAILABLE_VARIABLES = [
  { key: 'cliente_nome', description: 'Nome do cliente', example: 'João Silva' },
  { key: 'cliente_usuario', description: 'Usuário/login', example: 'joao123' },
  { key: 'cliente_telefone', description: 'Telefone', example: '(11) 98765-4321' },
  { key: 'data_vencimento', description: 'Data de vencimento', example: '15/11/2025' },
  { key: 'data_vencimento_extenso', description: 'Data por extenso', example: '15 de novembro de 2025' },
  { key: 'dias_restantes', description: 'Dias até vencer', example: '7' },
  { key: 'dias_restantes_texto', description: 'Texto descritivo', example: 'em 7 dias' },
  { key: 'ano_vencimento', description: 'Ano', example: '2025' },
  { key: 'mes_vencimento', description: 'Mês', example: 'novembro' },
  { key: 'valor', description: 'Valor formatado', example: '49,90' },
  { key: 'valor_numerico', description: 'Valor sem formatação', example: '49.90' },
  { key: 'desconto', description: 'Valor do desconto', example: '5,00' },
  { key: 'valor_final', description: 'Valor após desconto', example: '44,90' },
  { key: 'plano', description: 'Nome do plano', example: 'Premium' },
  { key: 'status_cliente', description: 'Status do cliente', example: 'Ativo' },
  { key: 'data_hoje', description: 'Data atual', example: '08/10/2025' },
  { key: 'hora_atual', description: 'Hora atual', example: '14:30' },
  { key: 'senha', description: 'Senha do usuário', example: '******' },
  { key: 'link_acesso', description: 'Link de acesso', example: 'https://...' },
  { key: 'link_pagamento', description: 'Link de pagamento', example: 'https://...' },
] as const;

export function getTypeLabel(type: string): string {
  return TEMPLATE_TYPES[type as keyof typeof TEMPLATE_TYPES]?.label || type;
}

export function getTypeIcon(type: string): string {
  return TEMPLATE_TYPES[type as keyof typeof TEMPLATE_TYPES]?.icon || '📄';
}

export function getTypeColor(type: string): string {
  return TEMPLATE_TYPES[type as keyof typeof TEMPLATE_TYPES]?.color || 'gray';
}

export function getTriggerLabel(trigger: string): string {
  return TRIGGER_EVENTS[trigger as keyof typeof TRIGGER_EVENTS]?.label || trigger;
}

export function getTriggerDescription(trigger: string): string {
  return TRIGGER_EVENTS[trigger as keyof typeof TRIGGER_EVENTS]?.description || '';
}

export function insertVariable(text: string, cursorPosition: number, variable: string): { text: string; newPosition: number } {
  const before = text.substring(0, cursorPosition);
  const after = text.substring(cursorPosition);
  const varText = `{{${variable}}}`;
  const newText = before + varText + after;
  const newPosition = cursorPosition + varText.length;
  
  return { text: newText, newPosition };
}

export function extractVariables(text: string): string[] {
  const regex = /\{\{([^}]+)\}\}/g;
  const matches = text.match(regex);
  if (!matches) return [];
  
  return [...new Set(matches.map(match => match.replace(/[{}]/g, '')))];
}

export function validateTemplate(data: {
  name?: string;
  message?: string;
  type?: string;
  trigger_event?: string;
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.name || data.name.trim().length < 3) {
    errors.push('Nome deve ter pelo menos 3 caracteres');
  }

  if (!data.message || data.message.trim().length < 10) {
    errors.push('Mensagem deve ter pelo menos 10 caracteres');
  }

  if (!data.type) {
    errors.push('Tipo é obrigatório');
  }

  if (!data.trigger_event) {
    errors.push('Evento é obrigatório');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
