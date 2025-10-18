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
import { useAuth } from "@/hooks/use-auth";

export default function WhatsAppPage() {
  const { user, loading: authLoading } = useAuth();
  
  // Log para debug
  React.useEffect(() => {
    console.log('👤 [WhatsAppPage] User:', user);
    console.log('👤 [WhatsAppPage] Reseller ID:', user?.reseller_id);
    console.log('👤 [WhatsAppPage] Auth Loading:', authLoading);
  }, [user, authLoading]);
  
  const {
    status,
    isLoading,
    error,
    connect,
    disconnect,
    sendMessage,
  } = useWhatsApp(user?.reseller_id);
  
  // Wrapper para connect que valida se o user está carregado
  const handleConnect = async () => {
    if (authLoading) {
      alert('⏳ Aguarde... Carregando informações do usuário.');
      return;
    }
    
    if (!user?.reseller_id) {
      alert('❌ Erro: Não foi possível identificar sua conta. Faça login novamente.');
      return;
    }
    
    console.log(`✅ [WhatsAppPage] Conectando com reseller_id: ${user.reseller_id}`);
    await connect();
  };

  // Buscar clientes reais do sistema
  const { data: systemClients } = useClients();

  // Contar clientes que têm WhatsApp cadastrado
  const clientsWithWhatsApp = systemClients?.filter(client => 
    client.phone && client.phone.trim().length > 0
  ) || [];



  const sendTestMessage = async () => {
    if (!status.connected) {
      alert("⚠️ WhatsApp não está conectado! Por favor, conecte primeiro.");
      return;
    }

    const testNumber = prompt("Digite o número para teste (com DDD, ex: 11999999999):");
    if (!testNumber) return;

    try {
      await sendMessage({
        to: testNumber,
        message: "🧪 Mensagem de teste do GestPlay!\n\nSe você recebeu esta mensagem, a integração está funcionando perfeitamente! ✅",
        type: "text",
      });
      alert("✅ Mensagem de teste enviada com sucesso!");
    } catch (error) {
      const errorMsg = (error as Error).message;
      alert(`❌ Erro ao enviar mensagem de teste:\n\n${errorMsg}\n\nDica: Aguarde alguns segundos após conectar antes de enviar mensagens.`);
      console.error("Erro detalhado:", error);
    }
  };



  return (
    <div className="container-responsive space-y-responsive">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-responsive-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
          WhatsApp Business
        </h1>
        <p className="text-muted-foreground text-responsive-base">
          Conecte seu WhatsApp para enviar cobranças automáticas aos clientes
        </p>
      </div>

      {/* Loading Auth Alert */}
      {authLoading && (
        <Alert className="bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800">
          <RefreshCw className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            Carregando informações da sua conta... Aguarde antes de conectar o WhatsApp.
          </AlertDescription>
        </Alert>
      )}

      {/* Status Card */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="p-responsive">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className={`p-2 sm:p-3 rounded-full flex-shrink-0 ${status.connected ? 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2 text-responsive-lg">
                  <span className="truncate">Status da Conexão</span>
                  {status.connected ? (
                    <Badge variant="default" className="bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800 w-fit">
                      <Wifi className="h-3 w-3 mr-1" />
                      Conectado
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800 w-fit">
                      <WifiOff className="h-3 w-3 mr-1" />
                      Desconectado
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-responsive-sm truncate">
                  {status.connected
                    ? `Conectado como ${status.phoneNumber}`
                    : "WhatsApp não está conectado"}
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              {status.connected ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={sendTestMessage}
                    className="gap-2 btn-responsive flex-1 sm:flex-initial"
                    disabled={isLoading}
                  >
                    <Send className="h-4 w-4" />
                    <span className="hide-mobile">Teste</span>
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={disconnect}
                    className="gap-2 btn-responsive flex-1 sm:flex-initial"
                    disabled={isLoading}
                  >
                    <XCircle className="h-4 w-4" />
                    <span className="hide-mobile">Desconectar</span>
                  </Button>
                </>
              ) : (
                <Button
                  onClick={handleConnect}
                  disabled={isLoading || authLoading}
                  className="gap-2 bg-green-600 hover:bg-green-700 btn-responsive w-full sm:w-auto"
                >
                  {isLoading || authLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <QrCode className="h-4 w-4" />
                  )}
                  {authLoading ? "Carregando..." : isLoading ? "Conectando..." : "Conectar WhatsApp"}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {status.connected && (
          <CardContent>
            <Alert className="mb-4 bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-800">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                ✅ WhatsApp conectado! Aguarde alguns segundos antes de enviar mensagens para garantir estabilidade da conexão.
              </AlertDescription>
            </Alert>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                <div>
                  <p className="font-medium text-green-900 dark:text-green-100">Conectado</p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Última atividade: {status.lastSeen}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/50 rounded-lg">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="font-medium text-blue-900 dark:text-blue-100">Clientes</p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {clientsWithWhatsApp.length} de {systemClients?.length || 0} com WhatsApp
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-950/50 rounded-lg">
                <Zap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <div>
                  <p className="font-medium text-purple-900 dark:text-purple-100">Automação</p>
                  <p className="text-sm text-purple-700 dark:text-purple-300">Ativa</p>
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
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
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
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{systemClients.length}</div>
                <div className="text-sm text-blue-700 dark:text-blue-300">Total de Clientes</div>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-950/50 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{clientsWithWhatsApp.length}</div>
                <div className="text-sm text-green-700 dark:text-green-300">Com WhatsApp</div>
              </div>
              <div className="text-center p-4 bg-orange-50 dark:bg-orange-950/50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {systemClients.length - clientsWithWhatsApp.length}
                </div>
                <div className="text-sm text-orange-700 dark:text-orange-300">Sem WhatsApp</div>
              </div>
            </div>
            
            {clientsWithWhatsApp.length > 0 && (
              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Cobertura WhatsApp: {Math.round((clientsWithWhatsApp.length / systemClients.length) * 100)}%
                </p>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-green-500 dark:bg-green-400 h-2 rounded-full transition-all duration-300"
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
      <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950/50 dark:to-green-950/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Como Funciona
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3 dark:text-white">Configuração Inicial</h4>
              <ol className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="bg-blue-600 dark:bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">1</span>
                  <span className="dark:text-gray-300">Clique em "Conectar WhatsApp"</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-blue-600 dark:bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">2</span>
                  <span className="dark:text-gray-300">Escaneie o QR Code com seu celular</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-blue-600 dark:bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">3</span>
                  <span className="dark:text-gray-300">Aguarde a confirmação da conexão</span>
                </li>
              </ol>
            </div>
            <div>
              <h4 className="font-semibold mb-3 dark:text-white">Envio Automático</h4>
              <ol className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="bg-green-600 dark:bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">1</span>
                  <span className="dark:text-gray-300">Configure os números dos clientes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-green-600 dark:bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">2</span>
                  <span className="dark:text-gray-300">Gere as cobranças normalmente</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-green-600 dark:bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">3</span>
                  <span className="dark:text-gray-300">As mensagens serão enviadas automaticamente</span>
                </li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}