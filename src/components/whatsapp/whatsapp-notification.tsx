"use client";

import React, { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  MessageCircle,
  X,
  ExternalLink,
} from "lucide-react";

interface WhatsAppNotificationProps {
  show: boolean;
  message: string;
  clientName?: string;
  clientPhone?: string;
  onClose: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

export function WhatsAppNotification({
  show,
  message,
  clientName,
  clientPhone,
  onClose,
  autoClose = true,
  autoCloseDelay = 5000,
}: WhatsAppNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      
      if (autoClose) {
        const timer = setTimeout(() => {
          handleClose();
        }, autoCloseDelay);
        
        return () => clearTimeout(timer);
      }
    }
  }, [show, autoClose, autoCloseDelay]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300); // Aguardar animação de saída
  };

  const openWhatsApp = () => {
    if (clientPhone) {
      // Remover caracteres especiais do número
      const cleanPhone = clientPhone.replace(/\D/g, '');
      // Abrir WhatsApp Web
      window.open(`https://web.whatsapp.com/send?phone=${cleanPhone}`, '_blank');
    }
  };

  if (!show) return null;

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
      <Alert className="bg-green-50 border-green-200 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="p-1 bg-green-100 rounded-full">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <MessageCircle className="h-4 w-4 text-green-600" />
              <span className="font-semibold text-green-800">
                WhatsApp Enviado
              </span>
            </div>
            
            <AlertDescription className="text-green-700">
              {message}
            </AlertDescription>
            
            {clientName && (
              <div className="mt-2 text-sm text-green-600">
                <strong>Cliente:</strong> {clientName}
                {clientPhone && (
                  <span className="ml-2">({clientPhone})</span>
                )}
              </div>
            )}
            
            {clientPhone && (
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
            className="h-6 w-6 p-0 text-green-600 hover:bg-green-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Alert>
    </div>
  );
}

// Hook para gerenciar notificações do WhatsApp
export function useWhatsAppNotification() {
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    clientName?: string;
    clientPhone?: string;
  }>({
    show: false,
    message: "",
  });

  const showNotification = (
    message: string,
    clientName?: string,
    clientPhone?: string
  ) => {
    setNotification({
      show: true,
      message,
      clientName,
      clientPhone,
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