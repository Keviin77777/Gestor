"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  MessageCircle,
  Send,
  AlertTriangle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { useWhatsApp } from "@/hooks/use-whatsapp";
import type { Client } from "@/lib/definitions";

interface WhatsAppSendButtonProps {
  client: Client;
  type?: "billing" | "reminder" | "custom";
  amount?: number;
  dueDate?: string;
  daysUntilDue?: number;
}

export function WhatsAppSendButton({
  client,
  type = "custom",
  amount,
  dueDate,
  daysUntilDue,
}: WhatsAppSendButtonProps) {
  const { status, sendMessage, sendBillingMessage, sendReminderMessage } = useWhatsApp();
  const [isOpen, setIsOpen] = useState(false);
  const [customMessage, setCustomMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

  // Verificar se o cliente tem WhatsApp
  const hasWhatsApp = client.phone && client.phone.trim().length > 0;

  // Gerar mensagem padrão baseada no tipo
  const getDefaultMessage = () => {
    switch (type) {
      case "billing":
        return `🔔 *Cobrança GestPlay*

Olá *${client.name}*!

Sua mensalidade está disponível:
💰 Valor: R$ ${amount?.toFixed(2) || "0,00"}
📅 Vencimento: ${dueDate || "N/A"}

Para renovar seu acesso, entre em contato conosco.

_Mensagem automática do sistema GestPlay_`;

      case "reminder":
        return `⏰ *Lembrete de Vencimento*

Olá *${client.name}*!

Seu acesso vence em *${daysUntilDue || 0} dias*.

Para evitar interrupções, renove seu plano em breve.

_Mensagem automática do sistema GestPlay_`;

      default:
        return `Olá *${client.name}*!

Sua mensagem personalizada aqui...

_Mensagem do sistema GestPlay_`;
    }
  };

  const handleSend = async () => {
    if (!hasWhatsApp) {
      setSendResult({
        success: false,
        message: "Cliente não possui número de WhatsApp cadastrado",
      });
      return;
    }

    if (!status.connected) {
      setSendResult({
        success: false,
        message: "WhatsApp não está conectado. Conecte primeiro na página do WhatsApp.",
      });
      return;
    }

    setIsSending(true);
    setSendResult(null);

    try {
      let result;

      if (type === "billing" && amount && dueDate) {
        result = await sendBillingMessage(client.phone!, client.name, amount, dueDate);
      } else if (type === "reminder" && daysUntilDue !== undefined) {
        result = await sendReminderMessage(client.phone!, client.name, daysUntilDue);
      } else {
        // Mensagem customizada
        const messageToSend = customMessage || getDefaultMessage();
        result = await sendMessage({
          to: client.phone!,
          message: messageToSend,
          type: "text",
        });
      }

      setSendResult({
        success: true,
        message: "Mensagem enviada com sucesso!",
      });

      // Fechar modal após 2 segundos
      setTimeout(() => {
        setIsOpen(false);
        setSendResult(null);
        setCustomMessage("");
      }, 2000);
    } catch (error) {
      setSendResult({
        success: false,
        message: error instanceof Error ? error.message : "Erro ao enviar mensagem",
      });
    } finally {
      setIsSending(false);
    }
  };

  // Se não tem WhatsApp, mostrar botão desabilitado
  if (!hasWhatsApp) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        className="gap-2 opacity-50"
      >
        <MessageCircle className="h-4 w-4" />
        Sem WhatsApp
      </Button>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 hover:bg-green-50 hover:border-green-300"
          disabled={!status.connected}
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            Enviar WhatsApp
          </DialogTitle>
          <DialogDescription>
            Enviar mensagem para {client.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status da conexão */}
          <div className="flex items-center gap-2">
            <Badge
              variant={status.connected ? "default" : "destructive"}
              className={status.connected ? "bg-green-100 text-green-800" : ""}
            >
              {status.connected ? "Conectado" : "Desconectado"}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {client.phone}
            </span>
          </div>

          {/* Mensagem */}
          {type === "custom" && (
            <div className="space-y-2">
              <Label htmlFor="message">Mensagem</Label>
              <Textarea
                id="message"
                placeholder={getDefaultMessage()}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={8}
                className="resize-none"
              />
            </div>
          )}

          {type !== "custom" && (
            <div className="space-y-2">
              <Label>Prévia da mensagem</Label>
              <div className="p-3 bg-gray-50 rounded-lg border text-sm whitespace-pre-line">
                {getDefaultMessage()}
              </div>
            </div>
          )}

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

          {/* Aviso se não conectado */}
          {!status.connected && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                WhatsApp não está conectado. Vá para a página do WhatsApp e conecte primeiro.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isSending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSend}
            disabled={!status.connected || isSending || !hasWhatsApp}
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {isSending ? "Enviando..." : "Enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}