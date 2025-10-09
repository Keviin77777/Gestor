"use client";

import React, { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  MessageCircle,
  X,
  ExternalLink,
  AlertTriangle,
  WifiOff,
} from "lucide-react";

interface WhatsAppAutoNotificationProps {
  show: boolean;
  type: 'success' | 'error' | 'no_phone' | 'not_connected';
  clientName: string;
  clientPhone?: string;
  message?: string;
  onClose: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

export function WhatsAppAutoNotification({
  show,
  type,
  clientName,
  clientPhone,
  message,
  onClose,
  autoClose = true,
  autoCloseDelay = 5000,
}: WhatsAppAutoNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      
      if (autoClose && type === 'success') {
        const timer = setTimeout(() => {
          handleClose();
        }, autoCloseDelay);
        
        return () => clearTimeout(timer);
      }
    }
  }, [show, autoClose, autoCloseDelay, type]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const openWhatsApp = () => {
    if (clientPhone) {
      const cleanPhone = clientPhone.replace(/\D/g, '');
      window.open(`https://web.whatsapp.com/send?phone=${cleanPhone}`, '_blank');
    }
  };

  const getNotificationConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: CheckCircle,
          title: 'WhatsApp Enviado',
          description: `Cobrança enviada automaticamente para ${clientName}`,
          bgColor: 'bg-green-50 border-green-200',
          iconColor: 'text-green-600',
          titleColor: 'text-green-800',
          descColor: 'text-green-700',
          showWhatsAppButton: true,
        };
      case 'no_phone':
        return {
          icon: AlertTriangle,
          title: 'Número não cadastrado',
          description: `${clientName} não possui número de WhatsApp cadastrado`,
          bgColor: 'bg-yellow-50 border-yellow-200',
          iconColor: 'text-yellow-600',
          titleColor: 'text-yellow-800',
          descColor: 'text-yellow-700',
          showWhatsAppButton: false,
        };
      case 'not_connected':
        return {
          icon: WifiOff,
          title: 'WhatsApp Desconectado',
          description: `Não foi possível enviar para ${clientName} - WhatsApp não está conectado`,
          bgColor: 'bg-red-50 border-red-200',
          iconColor: 'text-red-600',
          titleColor: 'text-red-800',
          descColor: 'text-red-700',
          showWhatsAppButton: false,
        };
      case 'error':
        return {
          icon: AlertTriangle,
          title: 'Erro no Envio',
          description: message || `Erro ao enviar mensagem para ${clientName}`,
          bgColor: 'bg-red-50 border-red-200',
          iconColor: 'text-red-600',
          titleColor: 'text-red-800',
          descColor: 'text-red-700',
          showWhatsAppButton: false,
        };
      default:
        return {
          icon: MessageCircle,
          title: 'WhatsApp',
          description: message || 'Notificação do WhatsApp',
          bgColor: 'bg-blue-50 border-blue-200',
          iconColor: 'text-blue-600',
          titleColor: 'text-blue-800',
          descColor: 'text-blue-700',
          showWhatsAppButton: false,
        };
    }
  };

  if (!show) return null;

  const config = getNotificationConfig();
  const Icon = config.icon;

  return (
    <div
      className={`
        fixed top-4 right-4 z-50 max-w-md w-full
        transform transition-all duration-300 ease-in-out
        ${isVisible 
          ? 'translate-x-0 opacity-100 scale-100' 
          : 'translate-x-full opacity-0 scale-95'
        }
      `}
    >
      <Alert className={`${config.bgColor} shadow-lg`}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className={`p-1 rounded-full ${config.bgColor}`}>
              <Icon className={`h-5 w-5 ${config.iconColor}`} />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <MessageCircle className={`h-4 w-4 ${config.iconColor}`} />
              <span className={`font-semibold ${config.titleColor}`}>
                {config.title}
              </span>
            </div>
            
            <AlertDescription className={config.descColor}>
              {config.description}
            </AlertDescription>
            
            {clientPhone && (
              <div className={`mt-2 text-sm ${config.descColor}`}>
                <strong>Número:</strong> {clientPhone}
              </div>
            )}
            
            {config.showWhatsAppButton && clientPhone && (
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={openWhatsApp}
                  className="h-7 text-xs bg-white hover:bg-green-50 border-green-300 text-green-700"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Abrir Chat
                </Button>
              </div>
            )}
          </div>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={handleClose}
            className={`h-6 w-6 p-0 ${config.iconColor} hover:${config.bgColor}`}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Alert>
    </div>
  );
}

// Hook para gerenciar notificações automáticas do WhatsApp
export function useWhatsAppAutoNotification() {
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'no_phone' | 'not_connected';
    clientName: string;
    clientPhone?: string;
    message?: string;
  }>({
    show: false,
    type: 'success',
    clientName: '',
  });

  const showNotification = (
    type: 'success' | 'error' | 'no_phone' | 'not_connected',
    clientName: string,
    clientPhone?: string,
    message?: string
  ) => {
    setNotification({
      show: true,
      type,
      clientName,
      clientPhone,
      message,
    });
  };

  const hideNotification = () => {
    setNotification(prev => ({
      ...prev,
      show: false,
    }));
  };

  return {
    notification,
    showNotification,
    hideNotification,
  };
}