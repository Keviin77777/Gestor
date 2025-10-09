"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  MessageCircle,
  Smartphone,
  QrCode,
  CheckCircle,
  XCircle,
  RefreshCw,
  Send,
  Users,
  Zap,
  AlertTriangle,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useWhatsApp } from "@/hooks/use-whatsapp";
import { useClients } from "@/hooks/use-clients";

export default function WhatsAppPage() {
  const {
    status,
    isLoading,
    error,
    connect,
    disconnect,
    sendMessage,
    sendBillingMessage,
  } = useWhatsApp();

  // Buscar clientes reais do sistema
  const { data: systemClients } = useClients();

  // Contar clientes que têm WhatsApp cadastrado
  const clientsWithWhatsApp = systemClients?.filter(client => 
    client.phone && client.phone.trim().length > 0
  ) || [];

  const sendTestMessage = async () => {
    try {
      await sendMessage({
        to: "5511999999999", // Número de teste
        message: "🧪 Mensagem de teste do GestPlay!\n\nSe você recebeu esta mensagem, a integração está funcionando perfeitamente! ✅",
        type: "text",
      });
      alert("Mensagem de teste enviada com sucesso!");
    } catch (error) {
      alert("Erro ao enviar mensagem de teste: " + (error as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
          WhatsApp Business
        </h1>
        <p className="text-muted-foreground">
          Conecte seu WhatsApp para enviar cobranças automáticas aos clientes
        </p>
      </div>

      {/* Status Card */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-full ${status.connected ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                <MessageCircle className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Status da Conexão
                  {status.connected ? (
                    <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                      <Wifi className="h-3 w-3 mr-1" />
                      Conectado
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-red-100 text-red-800 border-red-200">
                      <WifiOff className="h-3 w-3 mr-1" />
                      Desconectado
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {status.connected
                    ? `Conectado como ${status.phoneNumber}`
                    : "WhatsApp não está conectado"}
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              {status.connected ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={sendTestMessage}
                    className="gap-2"
                    disabled={isLoading}
                  >
                    <Send className="h-4 w-4" />
                    Teste
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={disconnect}
                    className="gap-2"
                    disabled={isLoading}
                  >
                    <XCircle className="h-4 w-4" />
                    Desconectar
                  </Button>
                </>
              ) : (
                <Button
                  onClick={connect}
                  disabled={isLoading}
                  className="gap-2 bg-green-600 hover:bg-green-700"
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <QrCode className="h-4 w-4" />
                  )}
                  {isLoading ? "Conectando..." : "Conectar WhatsApp"}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {status.connected && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-900">Conectado</p>
                  <p className="text-sm text-green-700">
                    Última atividade: {status.lastSeen}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-900">Clientes</p>
                  <p className="text-sm text-blue-700">
                    {clientsWithWhatsApp.length} de {systemClients?.length || 0} com WhatsApp
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                <Zap className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="font-medium text-purple-900">Automação</p>
                  <p className="text-sm text-purple-700">Ativa</p>
                </div>
              </div>
            </div>
          </CardContent>
        )}

        {error && (
          <CardContent>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Erro: {error}
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      {/* QR Code Card */}
      {status.qrCode && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Escaneie o QR Code
            </CardTitle>
            <CardDescription>
              Abra o WhatsApp no seu celular e escaneie o código abaixo
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            <div className="p-4 bg-white rounded-lg border-2 border-dashed border-gray-300">
              <img 
                src={status.qrCode} 
                alt="QR Code WhatsApp" 
                className="w-64 h-64 object-contain"
              />
            </div>
            <Alert>
              <Smartphone className="h-4 w-4" />
              <AlertDescription>
                1. Abra o WhatsApp no seu celular<br />
                2. Toque em "Mais opções" (⋮) e selecione "Dispositivos conectados"<br />
                3. Toque em "Conectar um dispositivo" e escaneie este código
              </AlertDescription>
            </Alert>

          </CardContent>
        </Card>
      )}

      {/* Loading Card */}
      {isLoading && !status.qrCode && (
        <Card className="border-0 shadow-lg">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <RefreshCw className="h-12 w-12 animate-spin text-blue-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Inicializando WhatsApp</h3>
            <p className="text-muted-foreground text-center">
              Preparando a conexão com o WhatsApp Web...
            </p>
          </CardContent>
        </Card>
      )}

      {/* Estatísticas dos Clientes */}
      {status.connected && systemClients && systemClients.length > 0 && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Estatísticas dos Clientes
            </CardTitle>
            <CardDescription>
              Visão geral dos clientes com WhatsApp cadastrado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{systemClients.length}</div>
                <div className="text-sm text-blue-700">Total de Clientes</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{clientsWithWhatsApp.length}</div>
                <div className="text-sm text-green-700">Com WhatsApp</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {systemClients.length - clientsWithWhatsApp.length}
                </div>
                <div className="text-sm text-orange-700">Sem WhatsApp</div>
              </div>
            </div>
            
            {clientsWithWhatsApp.length > 0 && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Cobertura WhatsApp: {Math.round((clientsWithWhatsApp.length / systemClients.length) * 100)}%
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(clientsWithWhatsApp.length / systemClients.length) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Features Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-blue-600" />
              Envio Automático
            </CardTitle>
            <CardDescription>
              Envie cobranças automaticamente para clientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Cobrança de renovação</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Lembretes de vencimento</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Confirmação de pagamento</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm">Avisos de suspensão</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              Gestão de Clientes
            </CardTitle>
            <CardDescription>
              Integração com sua base de clientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Sincronização automática</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Números validados</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Histórico de mensagens</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Status de entrega</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Instructions Card */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-blue-600" />
            Como Funciona
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">Configuração Inicial</h4>
              <ol className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">1</span>
                  <span>Clique em "Conectar WhatsApp"</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">2</span>
                  <span>Escaneie o QR Code com seu celular</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">3</span>
                  <span>Aguarde a confirmação da conexão</span>
                </li>
              </ol>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Envio Automático</h4>
              <ol className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="bg-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">1</span>
                  <span>Configure os números dos clientes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">2</span>
                  <span>Gere as cobranças normalmente</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">3</span>
                  <span>As mensagens serão enviadas automaticamente</span>
                </li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}