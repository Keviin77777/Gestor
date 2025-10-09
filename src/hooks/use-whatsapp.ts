"use client";

import { useState, useEffect, useCallback } from 'react';

export interface WhatsAppStatus {
  connected: boolean;
  qrCode?: string;
  phoneNumber?: string;
  lastSeen?: string;
  clientsCount?: number;
  sessionId?: string;
}

export interface WhatsAppMessage {
  to: string;
  message: string;
  type?: 'text' | 'image' | 'document';
}

export interface WhatsAppClient {
  id: string;
  name: string;
  phone: string;
  lastMessage?: string;
  lastMessageTime?: string;
}

// Evolution API Integration
// Documentação: https://doc.evolution-api.com/
class WhatsAppAPI {
  private baseUrl = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'http://localhost:3002';
  private apiKey = process.env.NEXT_PUBLIC_WHATSAPP_API_KEY || 'gestplay-api-key-2024';
  private instanceName = 'gestplay-instance';

  async getStatus(): Promise<WhatsAppStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/instance/connectionState/${this.instanceName}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.apiKey,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to get status');
      }
      
      const data = await response.json();
      const state = data.instance?.state;
      
      // Buscar informações detalhadas se conectado
      let phoneNumber = undefined;
      if (state === 'open') {
        try {
          const instanceResponse = await fetch(`${this.baseUrl}/instance/${this.instanceName}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'apikey': this.apiKey,
            },
          });
          
          if (instanceResponse.ok) {
            const instanceData = await instanceResponse.json();
            phoneNumber = instanceData.instance?.profileName || 'WhatsApp Conectado';
          }
        } catch (err) {
          console.log('Erro ao buscar detalhes da instância:', err);
        }
      }
      
      return {
        connected: state === 'open',
        phoneNumber: phoneNumber,
        lastSeen: state === 'open' ? new Date().toISOString() : undefined,
        sessionId: this.instanceName,
        clientsCount: 0,
      };
    } catch (error) {
      return {
        connected: false,
        sessionId: this.instanceName,
      };
    }
  }

  async startSession(): Promise<{ success: boolean; qrCode?: string; error?: string }> {
    try {
      // Primeiro, criar a instância
      const createResponse = await fetch(`${this.baseUrl}/instance/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.apiKey,
        },
        body: JSON.stringify({
          instanceName: this.instanceName,
          token: this.apiKey,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
        }),
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(errorData.message || 'Failed to create instance');
      }

      // Aguardar um pouco para a instância inicializar
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Obter o QR Code
      const qrResponse = await fetch(`${this.baseUrl}/instance/connect/${this.instanceName}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.apiKey,
        },
      });

      if (!qrResponse.ok) {
        throw new Error('Failed to get QR code');
      }

      const qrData = await qrResponse.json();
      
      return {
        success: true,
        qrCode: qrData.base64 || qrData.qrcode,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async stopSession(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/instance/logout/${this.instanceName}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.apiKey,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to stop session');
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async sendMessage(message: WhatsAppMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Formatar número para o padrão da Evolution API
      const formattedNumber = this.formatPhoneNumber(message.to);
      
      const payload = {
        number: formattedNumber,
        text: message.message,
      };

      const response = await fetch(`${this.baseUrl}/message/sendText/${this.instanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.apiKey,
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send message');
      }
      
      const result = await response.json();
      
      return {
        success: true,
        messageId: result.key?.id || `msg_${Date.now()}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private formatPhoneNumber(phone: string): string {
    // Remover todos os caracteres não numéricos
    const cleaned = phone.replace(/\D/g, '');
    
    // Se já tem código do país, retornar como está
    if (cleaned.length > 11) {
      return cleaned;
    }
    
    // Se é número brasileiro (10 ou 11 dígitos), adicionar código do país
    if (cleaned.length === 10 || cleaned.length === 11) {
      return '55' + cleaned;
    }
    
    return cleaned;
  }

  async getClients(): Promise<WhatsAppClient[]> {
    try {
      // A Evolution API não tem endpoint específico para clientes
      // Retornamos array vazio por enquanto
      return [];
    } catch (error) {
      return [];
    }
  }
}

export function useWhatsApp() {
  const [status, setStatus] = useState<WhatsAppStatus>({ connected: false });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<WhatsAppClient[]>([]);

  const api = new WhatsAppAPI();

  const checkStatus = useCallback(async () => {
    try {
      const currentStatus = await api.getStatus();
      setStatus(currentStatus);
      
      if (currentStatus.connected) {
        const whatsappClients = await api.getClients();
        setClients(whatsappClients);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, []);

  const connect = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await api.startSession();
      
      if (result.success) {
        if (result.qrCode) {
          setStatus(prev => ({ 
            ...prev, 
            qrCode: result.qrCode,
            connected: false 
          }));
          
          // Iniciar polling para verificar status da conexão
          const pollInterval = setInterval(async () => {
            try {
              const currentStatus = await api.getStatus();
              if (currentStatus.connected) {
                setStatus(currentStatus);
                clearInterval(pollInterval);
                console.log('✅ WhatsApp conectado com sucesso!');
              }
            } catch (err) {
              console.log('Erro no polling:', err);
            }
          }, 2000); // Verificar a cada 2 segundos
          
          // Limpar polling após 5 minutos
          setTimeout(() => {
            clearInterval(pollInterval);
          }, 300000);
        }
      } else {
        setError(result.error || 'Failed to connect');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await api.stopSession();
      setStatus({ connected: false });
      setClients([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Disconnect failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async (message: WhatsAppMessage) => {
    if (!status.connected) {
      throw new Error('WhatsApp not connected');
    }
    
    try {
      const result = await api.sendMessage(message);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to send message');
      }
      
      return result;
    } catch (err) {
      throw err;
    }
  }, [status.connected]);

  const sendBillingMessage = useCallback(async (clientPhone: string, clientName: string, amount: number, dueDate: string) => {
    const message = `🔔 *Cobrança GestPlay*

Olá *${clientName}*!

Sua mensalidade está disponível:
💰 Valor: R$ ${amount.toFixed(2)}
📅 Vencimento: ${dueDate}

Para renovar seu acesso, entre em contato conosco.

_Mensagem automática do sistema GestPlay_`;

    return await sendMessage({
      to: clientPhone,
      message,
      type: 'text',
    });
  }, [sendMessage]);

  const sendReminderMessage = useCallback(async (clientPhone: string, clientName: string, daysUntilDue: number) => {
    const message = `⏰ *Lembrete de Vencimento*

Olá *${clientName}*!

Seu acesso vence em *${daysUntilDue} dias*.

Para evitar interrupções, renove seu plano em breve.

_Mensagem automática do sistema GestPlay_`;

    return await sendMessage({
      to: clientPhone,
      message,
      type: 'text',
    });
  }, [sendMessage]);

  const sendSuspensionWarning = useCallback(async (clientPhone: string, clientName: string) => {
    const message = `⚠️ *Aviso de Suspensão*

Olá *${clientName}*!

Seu acesso está em atraso e será suspenso em breve.

Entre em contato para regularizar sua situação.

_Mensagem automática do sistema GestPlay_`;

    return await sendMessage({
      to: clientPhone,
      message,
      type: 'text',
    });
  }, [sendMessage]);

  // Verificar status periodicamente quando conectado
  useEffect(() => {
    if (status.connected) {
      const interval = setInterval(checkStatus, 30000); // Check every 30 seconds
      return () => clearInterval(interval);
    }
  }, [status.connected, checkStatus]);

  // Verificar status inicial
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Função utilitária para formatar números de telefone
  const formatPhoneNumber = useCallback((phone: string) => {
    // Remover todos os caracteres não numéricos
    const cleaned = phone.replace(/\D/g, '');
    
    // Se começar com 55 (Brasil), manter
    if (cleaned.startsWith('55')) {
      return cleaned;
    }
    
    // Se for número brasileiro sem código do país, adicionar 55
    if (cleaned.length === 10 || cleaned.length === 11) {
      return '55' + cleaned;
    }
    
    // Para outros países, retornar como está
    return cleaned;
  }, []);

  return {
    status,
    clients,
    isLoading,
    error,
    connect,
    disconnect,
    sendMessage,
    sendBillingMessage,
    sendReminderMessage,
    sendSuspensionWarning,
    checkStatus,
    formatPhoneNumber,
  };
}