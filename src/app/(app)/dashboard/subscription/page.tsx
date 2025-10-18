'use client';

import { useState } from 'react';
import { useResellerSubscription, useCreateSubscriptionPayment } from '@/hooks/use-reseller-subscription';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, CheckCircle2, Clock, AlertCircle, Copy, Check, RefreshCw, CreditCard } from 'lucide-react';
import { useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function SubscriptionPage() {
  const { data, loading, error, refetch } = useResellerSubscription();
  const { createPayment, loading: paymentLoading } = useCreateSubscriptionPayment();

  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  const handleSelectPlan = async (planId: string) => {
    setSelectedPlan(planId);
    const result = await createPayment({ plan_id: planId });

    if (result) {
      console.log('📦 Dados do pagamento recebidos:', result);
      console.log('🖼️ QR Code (primeiros 100 chars):', result.qr_code?.substring(0, 100));
      console.log('📝 PIX Code (primeiros 50 chars):', result.pix_code?.substring(0, 50));

      // Garantir que o QR Code tem o prefixo data:image
      if (result.qr_code && !result.qr_code.startsWith('data:image')) {
        console.log('⚠️ QR Code sem prefixo, adicionando...');
        result.qr_code = `data:image/png;base64,${result.qr_code}`;
        console.log('✅ QR Code com prefixo (primeiros 100 chars):', result.qr_code.substring(0, 100));
      }

      setPaymentData(result);
      setShowPaymentModal(true);

      // Fixar em 15 minutos (900 segundos)
      setTimeLeft(900);
    }
  };

  // Timer countdown - continua mesmo se fechar o modal
  useEffect(() => {
    if (timeLeft <= 0 || !paymentData) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleExpiredPayment();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, paymentData]);

  const handleExpiredPayment = async () => {
    if (!paymentData) return;

    try {
      console.log('⏰ Pagamento expirado, deletando:', paymentData.payment_id);

      // Deletar pagamento expirado do backend
      const apiUrl = process.env.NEXT_PUBLIC_PHP_API_URL || 'http://localhost:8080';
      const response = await fetch(`/api/reseller-subscription-payment/${paymentData.payment_id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        console.log('✅ Pagamento deletado com sucesso');
      }

      // Fechar modal se estiver aberto
      if (showPaymentModal) {
        setShowPaymentModal(false);
        alert('⏰ O tempo para pagamento expirou e o PIX foi cancelado. Por favor, gere um novo.');
      }

      // Limpar dados
      setPaymentData(null);
      setTimeLeft(0);

      // Atualizar lista
      refetch();
    } catch (error) {
      console.error('Erro ao deletar pagamento expirado:', error);
      setShowPaymentModal(false);
      setPaymentData(null);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopyPixCode = () => {
    if (paymentData?.pix_code) {
      navigator.clipboard.writeText(paymentData.pix_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClearHistory = async () => {
    if (!confirm('Tem certeza que deseja limpar todo o histórico de pagamentos? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_PHP_API_URL || 'http://localhost:8080';
      console.log('🗑️ Iniciando limpeza do histórico...');
      
      const response = await fetch(`/api/reseller-subscription-payment/clear-history`, {
        method: 'DELETE',
        credentials: 'include',
      });

      console.log('📥 Resposta da API:', response.status, response.statusText);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Resultado:', result);
        alert('✅ Histórico limpo com sucesso!');
        refetch();
      } else {
        const errorText = await response.text();
        console.error('❌ Erro da API:', errorText);
        throw new Error(`Erro ao limpar histórico: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('❌ Erro ao limpar histórico:', error);
      alert(`❌ Erro ao limpar histórico: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  const getStatusBadge = (health: string) => {
    switch (health) {
      case 'active':
        return <Badge className="bg-green-500">Ativo</Badge>;
      case 'expiring_soon':
        return <Badge className="bg-yellow-500">Vence em breve</Badge>;
      case 'expired':
        return <Badge className="bg-red-500">Expirado</Badge>;
      default:
        return <Badge variant="outline">Sem assinatura</Badge>;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500">Pago</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500">Pendente</Badge>;
      case 'failed':
        return <Badge className="bg-red-500">Falhou</Badge>;
      case 'cancelled':
        return <Badge variant="outline">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-500">Erro</CardTitle>
            <CardDescription>{error || 'Erro ao carregar dados'}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { subscription, plans, paymentHistory } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-700 dark:text-blue-300 text-sm font-medium">
            <RefreshCw className="h-4 w-4" />
            Gerenciamento de Assinatura
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Renovar Acesso
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Mantenha seu acesso ativo e aproveite todos os recursos da plataforma
          </p>
        </div>

        {/* Status Hero Card */}
        <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
          
          <CardContent className="relative p-6 sm:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Plano Atual - Coluna Esquerda */}
              <div className="lg:col-span-4 space-y-4">
                <div>
                  <p className="text-blue-100 text-xs sm:text-sm font-medium mb-3 uppercase tracking-wider">Plano Atual</p>
                  {subscription.plan_name ? (
                    <div className="space-y-2">
                      <h3 className="text-2xl sm:text-3xl font-bold leading-tight">{subscription.plan_name}</h3>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl sm:text-4xl font-bold">
                          R$ {subscription.plan_price?.toFixed(2)}
                        </span>
                        <span className="text-blue-100 text-sm">/mês</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-blue-100">
                      <AlertCircle className="h-5 w-5" />
                      <p>Nenhum plano ativo</p>
                    </div>
                  )}
                </div>

                {/* Botão Renovar ou Mensagem - Integrado ao card do plano */}
                {subscription.plan_id && subscription.plan_name && (
                  <>
                    {/* Mostrar botão apenas para planos pagos (não Trial) */}
                    {subscription.plan_id !== 'plan_trial' ? (
                      <Button
                        onClick={() => subscription.plan_id && handleSelectPlan(subscription.plan_id)}
                        disabled={paymentLoading && selectedPlan === subscription.plan_id}
                        className="w-full sm:w-auto bg-white/95 backdrop-blur-sm text-blue-600 hover:bg-white hover:scale-105 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-white/20"
                        size="lg"
                      >
                        {paymentLoading && selectedPlan === subscription.plan_id ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Processando...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="mr-2 h-5 w-5" />
                            Renovar Plano
                          </>
                        )}
                      </Button>
                    ) : (
                      /* Mensagem para Trial expirado ou próximo de expirar */
                      subscription.days_remaining !== null && subscription.days_remaining <= 1 && (
                        <div className="bg-white/10 backdrop-blur-sm border-2 border-white/30 rounded-lg p-4 space-y-2">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-10 h-10 bg-yellow-400/20 rounded-full flex items-center justify-center">
                              <AlertCircle className="h-5 w-5 text-yellow-300" />
                            </div>
                            <div className="flex-1 space-y-1">
                              <p className="text-sm font-semibold text-white">
                                {subscription.days_remaining <= 0 ? 'Trial Expirado' : 'Trial Expirando'}
                              </p>
                              <p className="text-xs text-blue-100 leading-relaxed">
                                {subscription.days_remaining <= 0 
                                  ? 'Seu período de teste acabou. Escolha um plano abaixo para continuar usando a plataforma.'
                                  : 'Seu período de teste está acabando. Escolha um plano abaixo para garantir acesso contínuo.'}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              const plansSection = document.getElementById('plans-section');
                              plansSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }}
                            className="w-full mt-2 px-4 py-2 bg-white/95 hover:bg-white text-blue-600 font-semibold rounded-lg transition-all duration-300 hover:scale-105 shadow-lg text-sm"
                          >
                            Ver Planos Disponíveis
                          </button>
                        </div>
                      )
                    )}
                  </>
                )}
              </div>

              {/* Separador Vertical */}
              <div className="hidden lg:block lg:col-span-1">
                <div className="h-32 w-px bg-white/20 mx-auto"></div>
              </div>

              {/* Dias Restantes - Centro */}
              <div className="lg:col-span-3 text-center">
                <p className="text-blue-100 text-xs sm:text-sm font-medium mb-3 uppercase tracking-wider">Dias Restantes</p>
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-white/10 rounded-full blur-xl"></div>
                  <div className="relative text-5xl sm:text-6xl md:text-7xl font-bold mb-2 bg-gradient-to-br from-white to-blue-100 bg-clip-text text-transparent">
                    {subscription.days_remaining !== null && subscription.days_remaining >= 0
                      ? subscription.days_remaining
                      : 0}
                  </div>
                </div>
                <p className="text-blue-100 text-sm mt-2">dias de acesso</p>
              </div>

              {/* Separador Vertical */}
              <div className="hidden lg:block lg:col-span-1">
                <div className="h-32 w-px bg-white/20 mx-auto"></div>
              </div>

              {/* Vencimento - Direita */}
              <div className="lg:col-span-3 text-center lg:text-right space-y-3">
                <p className="text-blue-100 text-xs sm:text-sm font-medium uppercase tracking-wider">Vencimento</p>
                <div className="space-y-2">
                  <div className="text-xl sm:text-2xl font-bold">
                    {subscription.subscription_expiry_date
                      ? format(new Date(subscription.subscription_expiry_date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })
                      : 'Não definido'}
                  </div>
                  <div className="flex items-center justify-center lg:justify-end gap-2">
                    {getStatusBadge(subscription.subscription_health)}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Planos Section */}
        <div id="plans-section" className="space-y-6 scroll-mt-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-2">Escolha seu Plano</h2>
            <p className="text-muted-foreground">Selecione o plano ideal para suas necessidades</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan, index) => {
              const isPopular = plan.id === 'plan_monthly';
              const isTrial = plan.id === 'plan_trial';

              return (
                <Card
                  key={plan.id}
                  className={`relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${isPopular
                    ? 'border-2 border-blue-500 shadow-lg scale-105'
                    : isTrial
                      ? 'border-2 border-green-500 bg-green-50 dark:bg-green-900/10'
                      : 'border hover:border-blue-200'
                    }`}
                >
                  {isPopular && (
                    <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-center py-2 text-sm font-medium">
                      Mais Popular
                    </div>
                  )}
                  {isTrial && (
                    <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-center py-2 text-sm font-medium">
                      Gratuito
                    </div>
                  )}

                  <CardHeader className={`text-center ${isPopular || isTrial ? 'pt-12' : 'pt-6'}`}>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <CardDescription className="text-sm">{plan.description}</CardDescription>
                  </CardHeader>

                  <CardContent className="text-center space-y-6">
                    <div>
                      <div className="text-4xl font-bold mb-2">
                        R$ {Number(plan.price).toFixed(2)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {plan.duration_days} dias de acesso
                      </p>
                      {!isTrial && (
                        <p className="text-xs text-muted-foreground mt-1">
                          R$ {(Number(plan.price) / plan.duration_days).toFixed(2)}/dia
                        </p>
                      )}
                    </div>

                    {!isTrial && (
                      <Button
                        className={`w-full ${isPopular
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600'
                          : ''
                          }`}
                        size="lg"
                        onClick={() => handleSelectPlan(plan.id)}
                        disabled={paymentLoading && selectedPlan === plan.id}
                      >
                        {paymentLoading && selectedPlan === plan.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processando...
                          </>
                        ) : (
                          <>
                            <CreditCard className="mr-2 h-4 w-4" />
                            Pagar com PIX
                          </>
                        )}
                      </Button>
                    )}

                    {isTrial && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="text-sm font-medium">Ativo</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Ativado automaticamente no registro
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Histórico Section */}
        {paymentHistory.length > 0 && (
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Histórico de Pagamentos
                  </CardTitle>
                  <CardDescription>
                    Acompanhe todos os seus pagamentos realizados
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearHistory}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Limpar Histórico
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {paymentHistory.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="font-semibold">{payment.plan_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(payment.payment_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="font-semibold text-lg">R$ {Number(payment.amount).toFixed(2)}</p>
                      {getPaymentStatusBadge(payment.status)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal de Pagamento PIX */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pagamento via PIX</DialogTitle>
            <DialogDescription>
              Escaneie o QR Code ou copie o código PIX para realizar o pagamento
            </DialogDescription>
          </DialogHeader>

          {paymentData && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-4">
                <div className="text-center">
                  <p className="font-semibold">{paymentData.plan_name}</p>
                  <p className="text-2xl font-bold text-green-600">
                    R$ {Number(paymentData.amount).toFixed(2)}
                  </p>
                </div>

                {/* QR Code */}
                <div className="bg-white p-4 rounded-lg">
                  {paymentData.qr_code ? (
                    <img
                      src={paymentData.qr_code}
                      alt="QR Code PIX"
                      className="w-64 h-64 object-contain"
                      onError={(e) => {
                        console.error('Erro ao carregar QR Code:', paymentData.qr_code?.substring(0, 100));
                        e.currentTarget.style.display = 'none';
                      }}
                      onLoad={() => console.log('QR Code carregado com sucesso')}
                    />
                  ) : (
                    <div className="w-64 h-64 flex items-center justify-center border-2 border-dashed">
                      <p className="text-sm text-muted-foreground">QR Code não disponível</p>
                    </div>
                  )}
                </div>

                {/* PIX Copia e Cola */}
                <div className="w-full space-y-2">
                  <p className="text-sm font-medium">PIX Copia e Cola:</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={paymentData.pix_code}
                      readOnly
                      className="flex-1 px-3 py-2 text-sm border rounded-md bg-muted"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCopyPixCode}
                    >
                      {copied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Timer */}
                <div className="text-center">
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${timeLeft < 300 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                    <Clock className="h-4 w-4" />
                    <span className="font-mono text-lg font-bold">{formatTime(timeLeft)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {timeLeft < 300 ? 'Tempo expirando!' : 'Tempo restante para pagamento'}
                  </p>
                </div>

                <div className="text-center text-sm text-muted-foreground">
                  <p>Válido até: {format(new Date(paymentData.expires_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                  <p className="mt-2">Após o pagamento, sua assinatura será ativada automaticamente</p>
                </div>
              </div>

              <Button
                className="w-full"
                variant="outline"
                onClick={() => {
                  setShowPaymentModal(false);
                  refetch();
                }}
              >
                Fechar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
