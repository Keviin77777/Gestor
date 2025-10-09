"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  MessageCircle,
  Send,
  AlertTriangle,
  CheckCircle,
  Loader2,
  X,
} from "lucide-react";
import { useWhatsApp } from "@/hooks/use-whatsapp";
import type { Client } from "@/lib/definitions";

interface AutoBillingWhatsAppProps {
  client: Client;
  amount: number;
  dueDate: string;
  isOpen: boolean;
  onClose: () => void;
  onSent?: () => void;
}

export function AutoBillingWhatsApp({
  client,
  amount,
  dueDate,
  isOpen,
  onClose,
  onSent,
}: AutoBillingWhatsAppProps) {
  const { status, sendBillingMessage } = useWhatsApp();
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);
  const [autoSendEnabled, setAutoSendEnabled] = useState(false);

  // Verificar se o cliente tem WhatsApp
  const hasWhatsApp = client.phone && client.phone.trim().length > 0;

  // Auto-envio se WhatsApp estiver conectado e cliente tiver número
  useEffect(() => {
    if (isOpen && status.connected && hasWhatsApp && autoSendEnabled) {
      handleAutoSend();
    }
  }, [isOpen, status.connected, hasWhatsApp, autoSendEnabled]);

  // Verificar configurações de auto-envio (pode vir de configurações do usuário)
  useEffect(() => {
    // Por enquanto, vamos deixar como opt-in manual
    // Em produção, isso pode vir de uma configuração do usuário
    setAutoSendEnabled(false);
  }, []);

  const handleAutoSend = async () => {
    if (!hasWhatsApp || !status.connected) return;

    setIsSending(true);
    setSendResult(null);

    try {
      await sendBillingMessage(client.phone!, client.name, amount, dueDate);
      
      setSendResult({
        success: true,
        message: "Cobrança enviada automaticamente via WhatsApp!",
      });

      onSent?.();

      // Fechar automaticamente após 3 segundos
      setTimeout(() => {
        onClose();
        setSendResult(null);
      }, 3000);
    } catch (error) {
      setSendResult({
        success: false,
        message: error instanceof Error ? error.message : "Erro ao enviar cobrança",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleManualSend = async () => {
    await handleAutoSend();
  };

  const formatDueDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return dateString;
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            Envio Automático - WhatsApp
          </DialogTitle>
          <DialogDescription>
            Cobrança gerada para {client.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações da cobrança */}
          <div className="p-4 bg-gray-50 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">Cliente:</span>
              <span>{client.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Valor:</span>
              <span className="font-bold text-green-600">R$ {amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Vencimento:</span>
              <span>{formatDueDate(dueDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">WhatsApp:</span>
              <span>{hasWhatsApp ? client.phone : "Não cadastrado"}</span>
            </div>
          </div>

          {/* Status da conexão */}
          <div className="flex items-center gap-2">
            <Badge
              variant={status.connected ? "default" : "destructive"}
              className={status.connected ? "bg-green-100 text-green-800" : ""}
            >
              {status.connected ? "WhatsApp Conectado" : "WhatsApp Desconectado"}
            </Badge>
          </div>

          {/* Resultado do envio */}
          {sendResult && (
            <Alert variant={sendResult.success ? "default" : "destructive"}>
              {sendResult.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <AlertDescription>{sendResult.message}</AlertDescription>
            </Alert>
          )}

          {/* Avisos */}
          {!hasWhatsApp && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Cliente não possui número de WhatsApp cadastrado. 
                Edite o cliente para adicionar o número.
              </AlertDescription>
            </Alert>
          )}

          {!status.connected && hasWhatsApp && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                WhatsApp não está conectado. Vá para a página do WhatsApp e conecte primeiro.
              </AlertDescription>
            </Alert>
          )}

          {/* Prévia da mensagem */}
          {hasWhatsApp && status.connected && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Prévia da mensagem:</label>
              <div className="p-3 bg-green-50 rounded-lg border text-sm whitespace-pre-line">
                {`🔔 *Cobrança GestPlay*

Olá *${client.name}*!

Sua mensalidade está disponível:
💰 Valor: R$ ${amount.toFixed(2)}
📅 Vencimento: ${formatDueDate(dueDate)}

Para renovar seu acesso, entre em contato conosco.

_Mensagem automática do sistema GestPlay_`}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSending}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            {sendResult?.success ? "Fechar" : "Pular"}
          </Button>
          
          {hasWhatsApp && status.connected && !sendResult?.success && (
            <Button
              onClick={handleManualSend}
              disabled={isSending}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {isSending ? "Enviando..." : "Enviar Agora"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}