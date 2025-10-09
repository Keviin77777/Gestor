"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  MessageCircle,
  Wifi,
  WifiOff,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { useWhatsApp } from "@/hooks/use-whatsapp";

interface WhatsAppStatusIndicatorProps {
  showDetails?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function WhatsAppStatusIndicator({
  showDetails = false,
  size = "md",
  className = "",
}: WhatsAppStatusIndicatorProps) {
  const { status, isLoading, error, checkStatus } = useWhatsApp();

  const getStatusColor = () => {
    if (isLoading) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    if (error) return "bg-red-100 text-red-800 border-red-200";
    if (status.connected) return "bg-green-100 text-green-800 border-green-200";
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getStatusIcon = () => {
    if (isLoading) return <RefreshCw className="h-3 w-3 animate-spin" />;
    if (error) return <AlertTriangle className="h-3 w-3" />;
    if (status.connected) return <CheckCircle className="h-3 w-3" />;
    return <WifiOff className="h-3 w-3" />;
  };

  const getStatusText = () => {
    if (isLoading) return "Verificando...";
    if (error) return "Erro";
    if (status.connected) return "Conectado";
    return "Desconectado";
  };

  const getDetailedStatus = () => {
    if (status.connected && status.phoneNumber) {
      return `Conectado como ${status.phoneNumber}`;
    }
    if (error) {
      return `Erro: ${error}`;
    }
    if (isLoading) {
      return "Verificando status da conexão...";
    }
    return "WhatsApp não está conectado";
  };

  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-1.5",
    lg: "text-base px-4 py-2",
  };

  if (showDetails) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium">WhatsApp:</span>
        </div>
        
        <Badge className={`${getStatusColor()} ${sizeClasses[size]} gap-1`}>
          {getStatusIcon()}
          {getStatusText()}
        </Badge>
        
        {status.connected && status.lastSeen && (
          <span className="text-sm text-muted-foreground">
            Última atividade: {new Date(status.lastSeen).toLocaleTimeString()}
          </span>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={checkStatus}
          disabled={isLoading}
          className="h-8 w-8 p-0"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className={`${getStatusColor()} ${sizeClasses[size]} gap-1 cursor-help ${className}`}>
            {getStatusIcon()}
            {getStatusText()}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getDetailedStatus()}</p>
          {status.connected && status.lastSeen && (
            <p className="text-xs opacity-75">
              Última atividade: {new Date(status.lastSeen).toLocaleString()}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Componente compacto para usar em headers ou barras de status
export function WhatsAppStatusBadge({ className = "" }: { className?: string }) {
  return (
    <WhatsAppStatusIndicator
      size="sm"
      className={className}
    />
  );
}

// Componente detalhado para usar em páginas ou seções específicas
export function WhatsAppStatusPanel({ className = "" }: { className?: string }) {
  return (
    <WhatsAppStatusIndicator
      showDetails={true}
      size="md"
      className={`p-4 bg-card rounded-lg border ${className}`}
    />
  );
}