"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Copy, X, Calendar, User, ExternalLink, Smartphone, Monitor, Sparkles } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface PaymentSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    client_name: string;
    new_renewal_date: string;
    sigma_renewed: boolean;
    sigma_response?: any;
    invoice_id: string;
    value: number;
  };
}

export function PaymentSuccessModal({ isOpen, onClose, data }: PaymentSuccessModalProps) {
  const { toast } = useToast();
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return format(parseISO(dateString), 'dd/MM/yyyy', { locale: ptBR });
  };

  const formatDateTime = (dateString: string) => {
    return format(parseISO(dateString), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR });
  };

  const copyToClipboard = async (text: string, item: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItem(item);
      toast({
        title: "Copiado!",
        description: `${item} copiado para a área de transferência`,
      });
      setTimeout(() => setCopiedItem(null), 2000);
    } catch (err) {
      toast({
        title: "Erro",
        description: "Não foi possível copiar para a área de transferência",
        variant: "destructive",
      });
    }
  };

  const getSigmaData = () => {
    if (!data.sigma_response?.data) return null;
    return data.sigma_response.data;
  };

  const sigmaData = getSigmaData();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[95vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 dark:from-green-950 dark:via-emerald-950 dark:to-teal-950 border-b relative overflow-hidden">
          {/* Sparkles Animation */}
          <div className="absolute inset-0 pointer-events-none">
            <Sparkles className="absolute top-2 right-4 h-4 w-4 text-green-400 animate-pulse" />
            <Sparkles className="absolute top-6 right-12 h-3 w-3 text-emerald-400 animate-pulse delay-300" />
            <Sparkles className="absolute top-4 right-20 h-2 w-2 text-teal-400 animate-pulse delay-700" />
          </div>
          <DialogTitle className="flex items-center gap-3 text-xl font-bold relative z-10">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-full animate-pulse">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="text-green-800 dark:text-green-200">
                Pagamento Processado com Sucesso!
              </div>
              <div className="text-sm text-green-600 dark:text-green-400 font-normal">
                Fatura #{data.invoice_id.substring(0, 8)} &nbsp;•&nbsp; {formatCurrency(data.value)}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Resumo do Pagamento - Cards Modernos */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 transform hover:scale-105 transition-all duration-200 hover:shadow-lg">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                    {formatCurrency(data.value)}
                  </div>
                  <div className="text-sm text-green-600 dark:text-green-400 font-medium">
                    Valor Pago
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 transform hover:scale-105 transition-all duration-200 hover:shadow-lg">
                <CardContent className="p-4 text-center">
                  <div className="text-lg font-bold text-blue-700 dark:text-blue-300 truncate">
                    {data.client_name}
                  </div>
                  <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                    Cliente
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950 dark:to-violet-950 transform hover:scale-105 transition-all duration-200 hover:shadow-lg">
                <CardContent className="p-4 text-center">
                  <div className="text-lg font-mono font-bold text-purple-700 dark:text-purple-300">
                    #{data.invoice_id.substring(0, 8)}
                  </div>
                  <div className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                    Fatura
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950 transform hover:scale-105 transition-all duration-200 hover:shadow-lg">
                <CardContent className="p-4 text-center">
                  <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 text-sm px-3 py-1">
                    ✓ Pago
                  </Badge>
                  <div className="text-sm text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                    Status
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Confirmação de Renovação */}
            {data.sigma_renewed && sigmaData && (
              <Card className="border-blue-200 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950 dark:via-indigo-950 dark:to-purple-950 overflow-hidden">
                <CardHeader className="pb-4 bg-gradient-to-r from-blue-100/50 to-indigo-100/50 dark:from-blue-900/50 dark:to-indigo-900/50">
                  <CardTitle className="text-xl text-blue-800 dark:text-blue-200 flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                      <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <div>Renovação Automática no Sigma IPTV</div>
                      <div className="text-sm text-blue-600 dark:text-blue-400 font-normal">
                        Cliente renovado com sucesso
                      </div>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  {/* Template de Confirmação */}
                  <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border-2 border-dashed border-blue-200 dark:border-blue-800 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-100 dark:bg-blue-900 rounded-lg">
                          <Copy className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h4 className="font-bold text-gray-800 dark:text-gray-200">Confirmação de Renovação</h4>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => copyToClipboard(
                          sigmaData.customer_renew_confirmation_template || 
                            `*Confirmação de Renovação*\n\n✅ Usuário: ${data.client_name}\n🗓️ Próximo Vencimento: ${formatDateTime(data.new_renewal_date)}`,
                          "Template de Confirmação"
                        )}
                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all duration-200 hover:shadow-lg"
                      >
                        <Copy className="h-3 w-3 mr-2" />
                        {copiedItem === "Template de Confirmação" ? "✓ Copiado!" : "Copiar Template"}
                      </Button>
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 p-4 rounded-lg border font-mono leading-relaxed">
                      {sigmaData.customer_renew_confirmation_template || 
                        `*Confirmação de Renovação*\n\n✅ Usuário: ${data.client_name}\n🗓️ Próximo Vencimento: ${formatDateTime(data.new_renewal_date)}`}
                    </div>
                  </div>

                  {/* Informações do Cliente */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-900 dark:to-gray-900 border-slate-200 dark:border-slate-700">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Dados do Cliente
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded-lg">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Usuário:</span>
                            <span className="text-sm font-mono font-bold text-slate-800 dark:text-slate-200">{sigmaData.username}</span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(sigmaData.username, "Usuário")}
                            className="h-7 w-7 p-0 hover:bg-slate-100 dark:hover:bg-slate-700"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-slate-500" />
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Vencimento:</span>
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{formatDate(sigmaData.expires_at)}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded-lg">
                          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Status:</span>
                          <Badge 
                            className={sigmaData.status === 'ACTIVE' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                            }
                          >
                            {sigmaData.status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900 dark:to-blue-900 border-indigo-200 dark:border-indigo-700">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                          <Monitor className="h-4 w-4" />
                          Configurações
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="p-2 bg-white dark:bg-indigo-800 rounded-lg">
                          <div className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Servidor:</div>
                          <div className="text-sm font-bold text-indigo-800 dark:text-indigo-200">{sigmaData.server}</div>
                        </div>
                        <div className="p-2 bg-white dark:bg-indigo-800 rounded-lg">
                          <div className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Pacote:</div>
                          <div className="text-sm font-bold text-indigo-800 dark:text-indigo-200">{sigmaData.package}</div>
                        </div>
                        <div className="p-2 bg-white dark:bg-indigo-800 rounded-lg">
                          <div className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Conexões:</div>
                          <div className="text-sm font-bold text-indigo-800 dark:text-indigo-200">{sigmaData.connections}</div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* URLs de Acesso */}
                  {(sigmaData.m3u_url || sigmaData.renew_url) && (
                    <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900 dark:to-pink-900 border-purple-200 dark:border-purple-700">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-lg font-bold text-purple-800 dark:text-purple-200 flex items-center gap-2">
                          <ExternalLink className="h-5 w-5" />
                          Links de Acesso
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {sigmaData.m3u_url && (
                          <div className="bg-white dark:bg-purple-800 p-4 rounded-xl border border-purple-200 dark:border-purple-600">
                            <div className="flex items-center gap-2 mb-2">
                              <Monitor className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                              <span className="text-sm font-bold text-purple-800 dark:text-purple-200">M3U URL</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <code className="text-xs bg-purple-50 dark:bg-purple-900 px-3 py-2 rounded-lg flex-1 font-mono text-purple-700 dark:text-purple-300 break-all">
                                {sigmaData.m3u_url}
                              </code>
                              <Button
                                size="sm"
                                onClick={() => copyToClipboard(sigmaData.m3u_url, "M3U URL")}
                                className="bg-purple-600 hover:bg-purple-700 text-white shadow-md transition-all duration-200 hover:shadow-lg"
                              >
                                <Copy className="h-3 w-3 mr-1" />
                                {copiedItem === "M3U URL" ? "✓" : "Copiar"}
                              </Button>
                            </div>
                          </div>
                        )}
                        {sigmaData.m3u_url_short && (
                          <div className="bg-white dark:bg-purple-800 p-4 rounded-xl border border-purple-200 dark:border-purple-600">
                            <div className="flex items-center gap-2 mb-2">
                              <Smartphone className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                              <span className="text-sm font-bold text-purple-800 dark:text-purple-200">M3U Curto</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <code className="text-xs bg-purple-50 dark:bg-purple-900 px-3 py-2 rounded-lg flex-1 font-mono text-purple-700 dark:text-purple-300 break-all">
                                {sigmaData.m3u_url_short}
                              </code>
                              <Button
                                size="sm"
                                onClick={() => copyToClipboard(sigmaData.m3u_url_short, "M3U Curto")}
                                className="bg-purple-600 hover:bg-purple-700 text-white shadow-md transition-all duration-200 hover:shadow-lg"
                              >
                                <Copy className="h-3 w-3 mr-1" />
                                {copiedItem === "M3U Curto" ? "✓" : "Copiar"}
                              </Button>
                            </div>
                          </div>
                        )}
                        {sigmaData.renew_url && (
                          <div className="bg-white dark:bg-purple-800 p-4 rounded-xl border border-purple-200 dark:border-purple-600">
                            <div className="flex items-center gap-2 mb-2">
                              <ExternalLink className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                              <span className="text-sm font-bold text-purple-800 dark:text-purple-200">Link de Renovação</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <code className="text-xs bg-purple-50 dark:bg-purple-900 px-3 py-2 rounded-lg flex-1 font-mono text-purple-700 dark:text-purple-300 break-all">
                                {sigmaData.renew_url}
                              </code>
                              <Button
                                size="sm"
                                onClick={() => copyToClipboard(sigmaData.renew_url, "Link de Renovação")}
                                className="bg-purple-600 hover:bg-purple-700 text-white shadow-md transition-all duration-200 hover:shadow-lg"
                              >
                                <Copy className="h-3 w-3 mr-1" />
                                {copiedItem === "Link de Renovação" ? "✓" : "Copiar"}
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
              </CardContent>
            </Card>
          )}

          </div>
        </div>
        
        {/* Botões de Ação - Footer Fixo */}
        <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900 dark:to-slate-900 border-t flex justify-center items-center">
          <Button 
            onClick={onClose} 
            className="bg-gradient-to-r from-gray-600 to-slate-600 hover:from-gray-700 hover:to-slate-700 text-white shadow-md transition-all duration-200 hover:shadow-lg px-8"
          >
            <X className="h-4 w-4 mr-2" />
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}