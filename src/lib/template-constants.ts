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
  // Templates para Revendedores (ADMIN)
  expiring_7days: { label: 'Vence em 7 dias', icon: '⚠️', color: 'yellow' },
  expiring_3days: { label: 'Vence em 3 dias', icon: '🚨', color: 'orange' },
  expiring_1day: { label: 'Vence AMANHÃ', icon: '🔴', color: 'red' },
  expired: { label: 'VENCIDA', icon: '❌', color: 'red' },
  payment_confirmed: { label: 'Pagamento Confirmado', icon: '✅', color: 'green' },
} as const;

export const TRIGGER_EVENTS = {
  user_created: { label: 'Usuário Criado', description: 'Quando um novo usuário é criado' },
  invoice_generated: { label: 'Fatura Gerada', description: 'Quando uma fatura é gerada' },
  invoice_paid: { label: 'Fatura Paga', description: 'Quando uma fatura é paga' },
  scheduled: { label: 'Agendado', description: 'Enviado em horário específico' },
  manual: { label: 'Manual', description: 'Enviado manualmente' },
  // Eventos para Revendedores (ADMIN)
  expiring_7days: { label: 'Vence em 7 dias', description: 'Assinatura do revendedor vence em 7 dias' },
  expiring_3days: { label: 'Vence em 3 dias', description: 'Assinatura do revendedor vence em 3 dias' },
  expiring_1day: { label: 'Vence AMANHÃ', description: 'Assinatura do revendedor vence amanhã' },
  expired: { label: 'VENCIDA', description: 'Assinatura do revendedor está vencida' },
  payment_confirmed: { label: 'Pagamento Confirmado', description: 'Pagamento do revendedor foi confirmado' },
  welcome: { label: 'Boas-vindas', description: 'Quando um novo revendedor é criado' },
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
  { key: 'referencia', description: 'Referência/Descrição', example: 'Mensalidade - outubro 2025' },
  { key: 'empresa_nome', description: 'Nome da empresa', example: 'GestPlay' },
  { key: 'data_atual', description: 'Data atual (alias)', example: '08/10/2025' },
  { key: 'plano_nome', description: 'Nome do plano (alias)', example: 'Premium' },
  { key: 'link_fatura', description: 'Link da fatura (alias)', example: 'https://...' },
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

export function getTypeBadgeClasses(type: string): string {
  const colorMap = {
    purple: 'bg-purple-50/50 text-purple-900 border-purple-300 font-semibold dark:bg-purple-100/10 dark:text-purple-200 dark:border-purple-400/30 dark:font-semibold',
    blue: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-600/50 dark:font-semibold',
    green: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-600/50 dark:font-semibold',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-600/50 dark:font-semibold',
    orange: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-200 dark:border-orange-600/50 dark:font-semibold',
    red: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-600/50 dark:font-semibold',
    cyan: 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-200 dark:border-cyan-600/50 dark:font-semibold',
    indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-200 dark:border-indigo-600/50 dark:font-semibold',
    gray: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-200 dark:border-gray-600/50 dark:font-semibold',
  };

  const color = getTypeColor(type);
  return colorMap[color as keyof typeof colorMap] || colorMap.gray;
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
