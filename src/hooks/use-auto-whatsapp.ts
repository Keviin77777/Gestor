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
  resellerId?: string;
  onSuccess?: (clientName: string, clientPhone?: string) => void;
  onError?: (error: string, clientName: string) => void;
  onNoPhone?: (clientName: string) => void;
  onNotConnected?: (clientName: string) => void;
}

export function useAutoWhatsApp(options: AutoWhatsAppOptions = {}) {
  const { showNotifications = true, resellerId, onSuccess, onError, onNoPhone, onNotConnected } = options;

  // Criar nome da instância baseado no reseller_id
  const getInstanceName = useCallback(() => {
    if (!resellerId) return 'UltraGestor-instance'; // Fallback para compatibilidade

    // Extrair apenas o ID numérico
    let cleanId = resellerId;

    // Se começa com "reseller_", extrair o ID
    if (resellerId.startsWith('reseller_')) {
      cleanId = resellerId.replace('reseller_', '');
    }

    // Extrair apenas números do início (antes de qualquer underscore ou caractere não numérico)
    const numericMatch = cleanId.match(/^(\d+)/);
    if (numericMatch) {
      cleanId = numericMatch[1];
    }

    // Criar nome da instância com ID limpo
    const instanceName = `reseller_${cleanId}`;
    console.log(`🔧 [useAutoWhatsApp] Criando instância: ${resellerId} → ${instanceName}`);

    return instanceName;
  }, [resellerId]);

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
      const whatsappInstance1 = getInstanceName();

      // Verificar se WhatsApp está conectado
      const statusResponse = await fetch(
        `${process.env.NEXT_PUBLIC_WHATSAPP_API_URL}/instance/connectionState/${whatsappInstance1}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.NEXT_PUBLIC_WHATSAPP_API_KEY || '',
          },
        }
      );

      const statusData = await statusResponse.json();

      // Verificar se há erro na resposta
      if (!statusResponse.ok || statusData.error) {
        console.warn('⚠️ Erro ao verificar status, mas continuando...', statusData);
        // Não bloquear o envio, apenas avisar
      }

      // Verificar estado da conexão
      const state = statusData.instance?.state || statusData.state;
      
      if (state && state !== 'open') {
        console.log('⚠️ WhatsApp não está conectado. Estado:', state);
        onNotConnected?.(client.name);
        return { success: false, reason: 'not_connected' };
      }

      // Buscar template de fatura do banco de dados
      let message = '';
      try {
        console.log('🔍 Buscando template de fatura...');
        
        // Chamar API PHP diretamente (mesmo padrão do mysql-api-client)
        const PHP_API_URL = process.env.NEXT_PUBLIC_PHP_API_URL || 'http://localhost:8080';
        const token = localStorage.getItem('token');
        const templatesResponse = await fetch(`${PHP_API_URL}/whatsapp-templates?active=true`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        console.log('📡 Resposta da API:', templatesResponse.status, templatesResponse.statusText);

        if (templatesResponse.ok) {
          const templates = await templatesResponse.json();
          console.log('📋 Templates recebidos:', Array.isArray(templates) ? templates.length : 'não é array', templates);

          // Garantir que templates é um array
          const templatesArray = Array.isArray(templates) ? templates : [];
          
          // Tentar encontrar template de várias formas
          // Prioridade 1: payment_link (template de link de pagamento)
          let invoiceTemplate = templatesArray.find((t: any) => 
            (t.type === 'payment_link' || t.type === 'invoice') && t.is_active
          );
          
          // Prioridade 2: Buscar por nome se não encontrou
          if (!invoiceTemplate) {
            invoiceTemplate = templatesArray.find((t: any) => 
              (t.name?.toLowerCase().includes('fatura') || 
               t.name?.toLowerCase().includes('pagamento') ||
               t.name?.toLowerCase().includes('link') ||
               t.name?.toLowerCase().includes('cobrança')) && 
              t.is_active
            );
            console.log('🔍 Buscando por nome, encontrado:', invoiceTemplate?.name || 'Nenhum');
          }
          
          // Prioridade 3: Buscar por trigger_event
          if (!invoiceTemplate) {
            invoiceTemplate = templatesArray.find((t: any) => 
              t.trigger_event === 'invoice_generated' && t.is_active
            );
            console.log('🔍 Buscando por trigger_event, encontrado:', invoiceTemplate?.name || 'Nenhum');
          }
          
          console.log('🎯 Template selecionado:', invoiceTemplate?.name || 'Nenhum');
          
          if (invoiceTemplate) {
            console.log('📝 Template encontrado:', {
              id: invoiceTemplate.id,
              name: invoiceTemplate.name,
              type: invoiceTemplate.type,
              is_active: invoiceTemplate.is_active,
              message_preview: invoiceTemplate.message?.substring(0, 100)
            });
          }

          if (invoiceTemplate) {
            // Processar variáveis do template
            const formattedDueDate = format(parseISO(dueDate), 'dd/MM/yyyy');
            const planName = (client as any).plan_name || 'Plano';

            // Buscar link de pagamento da fatura mais recente do cliente
            let paymentLink = 'Link não disponível';
            try {
              const PHP_API_URL = process.env.NEXT_PUBLIC_PHP_API_URL || 'http://localhost:8080';
              const token = localStorage.getItem('token');
              const invoicesResponse = await fetch(`${PHP_API_URL}/invoices?client_id=${client.id}`, {
                headers: {
                  'Authorization': token ? `Bearer ${token}` : '',
                  'Content-Type': 'application/json',
                },
                credentials: 'include',
              });

              if (invoicesResponse.ok) {
                const invoicesData = await invoicesResponse.json();
                const invoices = invoicesData.invoices || [];

                // Pegar a fatura mais recente com link
                const latestInvoiceWithLink = invoices
                  .filter((inv: any) => inv.payment_link)
                  .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

                if (latestInvoiceWithLink?.payment_link) {
                  paymentLink = latestInvoiceWithLink.payment_link;
                }
              }
            } catch (linkError) {
              console.warn('⚠️ Erro ao buscar link de pagamento:', linkError);
            }

            // Processar todas as variáveis do template (igual ao reminder processor)
            message = invoiceTemplate.message
              .replace(/\{\{cliente_nome\}\}/g, client.name)
              .replace(/\{\{CLIENT_NAME\}\}/g, client.name)
              .replace(/\{\{data_vencimento\}\}/g, formattedDueDate)
              .replace(/\{\{DUE_DATE\}\}/g, formattedDueDate)
              .replace(/\{\{valor\}\}/g, amount.toFixed(2).replace('.', ','))
              .replace(/\{\{AMOUNT\}\}/g, amount.toFixed(2).replace('.', ','))
              .replace(/\{\{valor_numerico\}\}/g, amount.toFixed(2))
              .replace(/\{\{plano\}\}/g, planName)
              .replace(/\{\{plano_nome\}\}/g, planName)
              .replace(/\{\{PLAN_NAME\}\}/g, planName)
              .replace(/\{\{link_fatura\}\}/g, paymentLink)
              .replace(/\{\{link_pagamento\}\}/g, paymentLink)
              .replace(/\{\{PAYMENT_LINK\}\}/g, paymentLink)
              .replace(/\{\{cliente_telefone\}\}/g, client.phone || '')
              .replace(/\{\{CLIENT_PHONE\}\}/g, client.phone || '')
              .replace(/\{\{cliente_usuario\}\}/g, (client as any).username || '')
              .replace(/\{\{USERNAME\}\}/g, (client as any).username || '')
              .replace(/\{\{data_atual\}\}/g, format(new Date(), 'dd/MM/yyyy'))
              .replace(/\{\{CURRENT_DATE\}\}/g, format(new Date(), 'dd/MM/yyyy'))
              .replace(/\{\{hora_atual\}\}/g, format(new Date(), 'HH:mm'))
              .replace(/\{\{empresa_nome\}\}/g, 'GestPlay')
              .replace(/\{\{BUSINESS_NAME\}\}/g, 'GestPlay');

            // Adicionar variável de referência se description estiver disponível
            if (description) {
              message = message.replace(/\{\{referencia\}\}/g, description);
              message = message.replace(/\{\{REFERENCE\}\}/g, description);
            } else {
              message = message.replace(/\{\{referencia\}\}/g, 'Mensalidade');
              message = message.replace(/\{\{REFERENCE\}\}/g, 'Mensalidade');
            }

            console.log('✅ Usando template de fatura do banco de dados:', invoiceTemplate.name);
            console.log('📝 Mensagem processada:', message.substring(0, 100) + '...');
          } else {
            console.warn('⚠️ Nenhum template de invoice ativo encontrado');
          }
        } else {
          console.warn('⚠️ Erro na resposta da API:', templatesResponse.status);
        }
      } catch (templateError) {
        console.warn('⚠️ Erro ao buscar template, usando mensagem padrão:', templateError);
      }

      // Fallback para mensagem padrão se não encontrou template
      if (!message) {
        console.log('⚠️ Usando mensagem padrão (fallback)');
        const formattedDueDate = format(parseISO(dueDate), 'dd/MM/yyyy');
        message = `💳 *Nova Fatura Disponível*

Olá *${client.name}*!

Sua fatura está disponível:
� Vaencimento: ${formattedDueDate}
💰 Valor: R$ ${amount.toFixed(2).replace('.', ',')}
${description ? `📋 Referente: ${description}` : ''}

Para renovar, entre em contato conosco.

_Mensagem automática do sistema GestPlay_`;
      }

      // Formatar número corretamente
      const formattedNumber = formatBrazilianPhone(client.phone);
      const whatsappInstance3 = getInstanceName();

      // Enviar mensagem (Evolution API v1.7.4 format)
      const sendResponse = await fetch(
        `${process.env.NEXT_PUBLIC_WHATSAPP_API_URL}/message/sendText/${whatsappInstance3}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.NEXT_PUBLIC_WHATSAPP_API_KEY || '',
          },
          body: JSON.stringify({
            number: formattedNumber,
            textMessage: {
              text: message,
            },
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
      const whatsappInstance = getInstanceName();

      // Verificar conexão
      const statusResponse = await fetch(
        `${process.env.NEXT_PUBLIC_WHATSAPP_API_URL}/instance/connectionState/${whatsappInstance}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.NEXT_PUBLIC_WHATSAPP_API_KEY || '',
          },
        }
      );

      const statusData = await statusResponse.json();

      // Verificar se há erro na resposta
      if (!statusResponse.ok || statusData.error) {
        console.warn('⚠️ Erro ao verificar status, mas continuando...', statusData);
      }

      // Verificar estado da conexão
      const state = statusData.instance?.state || statusData.state;
      
      if (state && state !== 'open') {
        return { success: false, reason: 'not_connected' };
      }

      // Criar mensagem de lembrete
      const message = `⏰ *Lembrete de Vencimento*

Olá *${client.name}*!

Seu acesso vence em *${daysUntilDue} ${daysUntilDue === 1 ? 'dia' : 'dias'}*.

Para evitar interrupções, renove seu plano em breve.

_Mensagem automática do sistema UltraGestor_`;

      // Formatar número corretamente
      const formattedNumber = formatBrazilianPhone(client.phone);
      const whatsappInstance2 = getInstanceName();

      // Enviar mensagem (Evolution API v1.7.4 format)
      const sendResponse = await fetch(
        `${process.env.NEXT_PUBLIC_WHATSAPP_API_URL}/message/sendText/${whatsappInstance2}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.NEXT_PUBLIC_WHATSAPP_API_KEY || '',
          },
          body: JSON.stringify({
            number: formattedNumber,
            textMessage: {
              text: message,
            },
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
      const whatsappInstance = getInstanceName();

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_WHATSAPP_API_URL}/instance/connectionState/${whatsappInstance}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.NEXT_PUBLIC_WHATSAPP_API_KEY || '',
          },
        }
      );

      const data = await response.json();

      if (!response.ok && !data.state && !data.instance) {
        return { connected: false, error: 'API não disponível' };
      }

      const state = data.instance?.state || data.state;

      return {
        connected: state === 'open',
        state: state || 'close',
      };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }, [getInstanceName]);

  return {
    sendBillingMessage,
    sendReminderMessage,
    checkWhatsAppStatus,
  };
}
