"use client";

import { useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import type { Client } from '@/lib/definitions';

// Função para formatar número de telefone brasileiro
function formatBrazilianPhone(phone: string): string {
  // Remover todos os caracteres não numéricos
  const cleaned = phone.replace(/\D/g, '');

  console.log(`📱 Formatando número: ${phone} -> ${cleaned}`);

  // Se já tem código do país 55, remover
  let number = cleaned;
  if (number.startsWith('55') && number.length > 11) {
    number = number.substring(2);
    console.log(`📱 Removido código 55: ${number}`);
  }

  // Se tem mais de 11 dígitos, pegar apenas os últimos 11
  if (number.length > 11) {
    number = number.substring(number.length - 11);
    console.log(`📱 Ajustado para 11 dígitos: ${number}`);
  }

  // Verificar se é um número brasileiro válido
  if (number.length === 11) {
    // Formato: 11987654321 (DDD + 9 + 8 dígitos)
    const ddd = number.substring(0, 2);
    const firstDigit = number.substring(2, 3);

    // Verificar se DDD é válido (11-99)
    const dddNum = parseInt(ddd);
    if (dddNum >= 11 && dddNum <= 99 && firstDigit === '9') {
      const result = '55' + number;
      console.log(`📱 Número brasileiro válido: ${result}`);
      return result; // Adicionar código do país
    }
  } else if (number.length === 10) {
    // Formato: 1133334444 (DDD + 8 dígitos) - telefone fixo
    const ddd = number.substring(0, 2);
    const dddNum = parseInt(ddd);
    if (dddNum >= 11 && dddNum <= 99) {
      const result = '55' + number;
      console.log(`📱 Telefone fixo brasileiro válido: ${result}`);
      return result; // Adicionar código do país
    }
  }

  // Se não conseguiu formatar como brasileiro, retornar como está
  console.warn(`⚠️ Número não reconhecido como brasileiro: ${phone} -> ${number}`);
  return number;
}

interface AutoWhatsAppOptions {
  showNotifications?: boolean;
  onSuccess?: (clientName: string, clientPhone?: string) => void;
  onError?: (error: string, clientName: string) => void;
  onNoPhone?: (clientName: string) => void;
  onNotConnected?: (clientName: string) => void;
}

export function useAutoWhatsApp(options: AutoWhatsAppOptions = {}) {
  const { showNotifications = true, onSuccess, onError, onNoPhone, onNotConnected } = options;

  const sendBillingMessage = useCallback(async (
    client: Client,
    amount: number,
    dueDate: string,
    description?: string
  ) => {
    // Verificar se cliente tem WhatsApp
    if (!client.phone || !client.phone.trim()) {
      console.log(`⚠️ Cliente ${client.name} não possui número de WhatsApp`);
      onNoPhone?.(client.name);
      return { success: false, reason: 'no_phone' };
    }

    try {
      // Verificar se WhatsApp está conectado
      const statusResponse = await fetch(
        `${process.env.NEXT_PUBLIC_WHATSAPP_API_URL}/instance/connectionState/gestplay-instance`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.NEXT_PUBLIC_WHATSAPP_API_KEY || '',
          },
        }
      );

      if (!statusResponse.ok) {
        throw new Error('Erro ao verificar status do WhatsApp');
      }

      const statusData = await statusResponse.json();

      if (statusData.instance?.state !== 'open') {
        console.log('⚠️ WhatsApp não está conectado');
        onNotConnected?.(client.name);
        return { success: false, reason: 'not_connected' };
      }

      // Buscar template de fatura do banco de dados
      let message = '';
      try {
        const templatesResponse = await fetch('/api/whatsapp/reminder-templates?type=invoice&active=true', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });

        if (templatesResponse.ok) {
          const templates = await templatesResponse.json();
          const invoiceTemplate = templates.find((t: any) => t.type === 'invoice' && t.is_active);

          if (invoiceTemplate) {
            // Processar variáveis do template
            const formattedDueDate = format(parseISO(dueDate), 'dd/MM/yyyy');
            const planName = (client as any).plan_name || 'Plano';

            message = invoiceTemplate.message
              .replace(/\{\{cliente_nome\}\}/g, client.name)
              .replace(/\{\{data_vencimento\}\}/g, formattedDueDate)
              .replace(/\{\{valor\}\}/g, amount.toFixed(2))
              .replace(/\{\{plano\}\}/g, planName);

            console.log('✅ Usando template de fatura do banco de dados');
          }
        }
      } catch (templateError) {
        console.warn('⚠️ Erro ao buscar template, usando mensagem padrão:', templateError);
      }

      // Fallback para mensagem padrão se não encontrou template
      if (!message) {
        const formattedDueDate = format(parseISO(dueDate), 'dd/MM/yyyy');
        message = `💳 *Nova Fatura Disponível*

Olá *${client.name}*!

Sua fatura mensal está disponível:
📅 Vencimento: ${formattedDueDate}
💰 Valor: R$ ${amount.toFixed(2)}
${description ? `📋 Referente: ${description}` : ''}

Para renovar, entre em contato conosco.

_Mensagem automática do sistema GestPlay_`;
      }

      // Formatar número corretamente
      const formattedNumber = formatBrazilianPhone(client.phone);

      // Enviar mensagem
      const sendResponse = await fetch(
        `${process.env.NEXT_PUBLIC_WHATSAPP_API_URL}/message/sendText/gestplay-instance`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.NEXT_PUBLIC_WHATSAPP_API_KEY || '',
          },
          body: JSON.stringify({
            number: formattedNumber,
            text: message,
          }),
        }
      );

      if (!sendResponse.ok) {
        const errorData = await sendResponse.json();
        throw new Error(errorData.message || 'Erro ao enviar mensagem');
      }

      const result = await sendResponse.json();

      console.log(`✅ Cobrança enviada via WhatsApp para ${client.name} (${formattedNumber})`);

      // Callbacks
      onSuccess?.(client.name, client.phone);

      return {
        success: true,
        messageId: result.key?.id,
        timestamp: result.messageTimestamp,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error(`❌ Erro ao enviar WhatsApp para ${client.name}:`, errorMessage);

      onError?.(errorMessage, client.name);

      return {
        success: false,
        reason: 'send_error',
        error: errorMessage,
      };
    }
  }, [showNotifications, onSuccess, onError, onNoPhone, onNotConnected]);

  const sendReminderMessage = useCallback(async (
    client: Client,
    daysUntilDue: number
  ) => {
    if (!client.phone || !client.phone.trim()) {
      return { success: false, reason: 'no_phone' };
    }

    try {
      // Verificar conexão
      const statusResponse = await fetch(
        `${process.env.NEXT_PUBLIC_WHATSAPP_API_URL}/instance/connectionState/gestplay-instance`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.NEXT_PUBLIC_WHATSAPP_API_KEY || '',
          },
        }
      );

      if (!statusResponse.ok) {
        throw new Error('Erro ao verificar status do WhatsApp');
      }

      const statusData = await statusResponse.json();

      if (statusData.instance?.state !== 'open') {
        return { success: false, reason: 'not_connected' };
      }

      // Criar mensagem de lembrete
      const message = `⏰ *Lembrete de Vencimento*

Olá *${client.name}*!

Seu acesso vence em *${daysUntilDue} ${daysUntilDue === 1 ? 'dia' : 'dias'}*.

Para evitar interrupções, renove seu plano em breve.

_Mensagem automática do sistema GestPlay_`;

      // Formatar número corretamente
      const formattedNumber = formatBrazilianPhone(client.phone);

      // Enviar mensagem
      const sendResponse = await fetch(
        `${process.env.NEXT_PUBLIC_WHATSAPP_API_URL}/message/sendText/gestplay-instance`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.NEXT_PUBLIC_WHATSAPP_API_KEY || '',
          },
          body: JSON.stringify({
            number: formattedNumber,
            text: message,
          }),
        }
      );

      if (!sendResponse.ok) {
        const errorData = await sendResponse.json();
        throw new Error(errorData.message || 'Erro ao enviar mensagem');
      }

      const result = await sendResponse.json();

      console.log(`✅ Lembrete enviado via WhatsApp para ${client.name} (${formattedNumber})`);

      onSuccess?.(client.name, client.phone);

      return {
        success: true,
        messageId: result.key?.id,
        timestamp: result.messageTimestamp,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error(`❌ Erro ao enviar lembrete para ${client.name}:`, errorMessage);

      onError?.(errorMessage, client.name);

      return {
        success: false,
        reason: 'send_error',
        error: errorMessage,
      };
    }
  }, [showNotifications, onSuccess, onError]);

  const checkWhatsAppStatus = useCallback(async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_WHATSAPP_API_URL}/instance/connectionState/gestplay-instance`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.NEXT_PUBLIC_WHATSAPP_API_KEY || '',
          },
        }
      );

      if (!response.ok) {
        return { connected: false, error: 'API não disponível' };
      }

      const data = await response.json();
      return {
        connected: data.instance?.state === 'open',
        state: data.instance?.state || 'close',
      };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }, []);

  return {
    sendBillingMessage,
    sendReminderMessage,
    checkWhatsAppStatus,
  };
}