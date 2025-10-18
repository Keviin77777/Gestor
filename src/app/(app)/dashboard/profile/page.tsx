'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useResellerSubscription, useCreateSubscriptionPayment } from '@/hooks/use-reseller-subscription';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  User, 
  Mail, 
  Calendar, 
  Shield, 
  Edit3, 
  Save, 
  X,
  Crown,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  Copy,
  Check,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ProfilePage() {
  const { user, isAdmin } = useAuth();
  const { data: subscriptionData, refetch } = useResellerSubscription();
  const { createPayment, loading: paymentLoading } = useCreateSubscriptionPayment();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    display_name: '',
    email: '',
    phone: ''
  });
  
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  // Estados para renovação
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // Dados do usuário (combinando auth e subscription)
  const userData = {
    id: user?.reseller_id || subscriptionData?.subscription?.id,
    email: user?.email || subscriptionData?.subscription?.email || 'admin@UltraGestor.com',
    display_name: user?.display_name || subscriptionData?.subscription?.display_name || (isAdmin ? 'Administrador' : 'Revendedor'),
    phone: (user as any)?.phone || (subscriptionData?.subscription as any)?.phone || '',
    created_at: (user as any)?.created_at || subscriptionData?.subscription?.subscription_start_date,
    subscription_expiry_date: subscriptionData?.subscription?.subscription_expiry_date,
    subscription_health: subscriptionData?.subscription?.subscription_health,
    plan_name: subscriptionData?.subscription?.plan_name,
    days_remaining: subscriptionData?.subscription?.days_remaining || 0
  };

  const handleEdit = () => {
    setFormData({
      display_name: userData.display_name || '',
      email: userData.email || '',
      phone: userData.phone || ''
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    // TODO: Implementar API para atualizar perfil
    console.log('Salvando dados:', formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      display_name: '',
      email: '',
      phone: ''
    });
  };

  const handleChangePassword = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) {
      alert('As senhas não coincidem!');
      return;
    }
    
    if (passwordData.new_password.length < 6) {
      alert('A nova senha deve ter pelo menos 6 caracteres!');
      return;
    }

    // TODO: Implementar API para alterar senha
    console.log('Alterando senha:', passwordData);
    alert('Senha alterada com sucesso!');
    setIsChangingPassword(false);
    setPasswordData({
      current_password: '',
      new_password: '',
      confirm_password: ''
    });
  };

  const handleCancelPasswordChange = () => {
    setIsChangingPassword(false);
    setPasswordData({
      current_password: '',
      new_password: '',
      confirm_password: ''
    });
  };

  // Função para renovar plano
  const handleRenewPlan = async () => {
    if (!subscriptionData?.subscription?.plan_id) {
      alert('Nenhum plano encontrado para renovar');
      return;
    }

    const result = await createPayment({ plan_id: subscriptionData.subscription.plan_id });

    if (result) {
      console.log('📦 Dados do pagamento recebidos:', result);

      // Garantir que o QR Code tem o prefixo data:image
      if (result.qr_code && !result.qr_code.startsWith('data:image')) {
        result.qr_code = `data:image/png;base64,${result.qr_code}`;
      }

      setPaymentData(result);
      setShowRenewalModal(true);
      setTimeLeft(900); // 15 minutos
    }
  };

  // Timer countdown
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

      const response = await fetch(`/api/reseller-subscription-payment/${paymentData.payment_id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        console.log('✅ Pagamento deletado com sucesso');
      }

      if (showRenewalModal) {
        setShowRenewalModal(false);
        alert('⏰ O tempo para pagamento expirou e o PIX foi cancelado. Por favor, gere um novo.');
      }

      setPaymentData(null);
      setTimeLeft(0);
      refetch();
    } catch (error) {
      console.error('Erro ao deletar pagamento expirado:', error);
      setShowRenewalModal(false);
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

  const getSubscriptionStatusBadge = () => {
    if (isAdmin) {
      return (
        <Badge className="bg-gradient-to-r from-purple-500 to-blue-600 text-white">
          <Crown className="w-3 h-3 mr-1" />
          Administrador
        </Badge>
      );
    }

    switch (userData.subscription_health) {
      case 'active':
        return (
          <Badge className="bg-green-500 text-white">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Ativo
          </Badge>
        );
      case 'expiring_soon':
        return (
          <Badge className="bg-yellow-500 text-white">
            <Clock className="w-3 h-3 mr-1" />
            Expirando
          </Badge>
        );
      case 'expired':
        return (
          <Badge className="bg-red-500 text-white">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Expirado
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <User className="w-3 h-3 mr-1" />
            Revendedor
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full overflow-x-hidden">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold truncate">Meu Perfil</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Gerencie suas informações pessoais e configurações da conta</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Card Principal do Perfil */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                <Avatar className="w-14 h-14 sm:w-16 sm:h-16 ring-4 ring-slate-200 dark:ring-slate-700 flex-shrink-0">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-base sm:text-lg">
                    {isAdmin 
                      ? 'AD' 
                      : (userData.display_name || 'Usuario')
                          .split(' ')
                          .map(n => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)
                    }
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-lg sm:text-xl md:text-2xl truncate">{userData.display_name}</CardTitle>
                  <CardDescription className="text-xs sm:text-sm md:text-base truncate">{userData.email}</CardDescription>
                  <div className="mt-2">
                    {getSubscriptionStatusBadge()}
                  </div>
                </div>
              </div>
              {!isEditing ? (
                <Button onClick={handleEdit} variant="outline" size="sm" className="w-full sm:w-auto flex-shrink-0">
                  <Edit3 className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              ) : (
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button onClick={handleSave} size="sm" className="flex-1 sm:flex-initial">
                    <Save className="w-4 h-4 mr-2" />
                    Salvar
                  </Button>
                  <Button onClick={handleCancel} variant="outline" size="sm" className="flex-1 sm:flex-initial">
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="display_name">Nome de Exibição</Label>
                {isEditing ? (
                  <Input
                    id="display_name"
                    value={formData.display_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                    placeholder="Seu nome completo"
                  />
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <User className="w-4 h-4 text-slate-500" />
                    <span>{userData.display_name || 'Não informado'}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                {isEditing ? (
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="seu@email.com"
                  />
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <Mail className="w-4 h-4 text-slate-500" />
                    <span>{userData.email}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                {isEditing ? (
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(11) 99999-9999"
                  />
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <span>{userData.phone || 'Não informado'}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>ID do Usuário</Label>
                <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <Shield className="w-4 h-4 text-slate-500" />
                  <span className="font-mono text-sm">{userData.id || 'N/A'}</span>
                </div>
              </div>
            </div>

            {userData.created_at && (
              <>
                <Separator />
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <Calendar className="w-4 h-4" />
                  <span>
                    Membro desde {format(new Date(userData.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Card de Informações da Assinatura e Estatísticas - Coluna Direita */}
        <div className="space-y-6">
          {!isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Assinatura</CardTitle>
                <CardDescription>Status da sua assinatura</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {userData.plan_name && (
                  <div>
                    <Label className="text-sm font-medium">Plano Atual</Label>
                    <p className="text-lg font-semibold">{userData.plan_name}</p>
                  </div>
                )}

                {userData.subscription_expiry_date && (
                  <div>
                    <Label className="text-sm font-medium">Data de Vencimento</Label>
                    <p className="text-lg font-semibold">
                      {format(new Date(userData.subscription_expiry_date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                  </div>
                )}

                {userData.days_remaining !== null && userData.days_remaining !== undefined && (
                  <div>
                    <Label className="text-sm font-medium">Dias Restantes</Label>
                    <p className={`text-lg font-semibold ${
                      userData.days_remaining <= 0 
                        ? 'text-red-600' 
                        : userData.days_remaining <= 7 
                          ? 'text-yellow-600' 
                          : 'text-green-600'
                    }`}>
                      {userData.days_remaining <= 0 ? 'Expirado' : `${userData.days_remaining} dias`}
                    </p>
                  </div>
                )}

                <div className="pt-4 space-y-3">
                  {getSubscriptionStatusBadge()}
                  
                  {userData.plan_name && (
                    <Button 
                      onClick={handleRenewPlan}
                      disabled={paymentLoading}
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                    >
                      {paymentLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Renovar Plano
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Card de Estatísticas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Estatísticas</CardTitle>
              <CardDescription>Resumo da sua atividade</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-3 bg-blue-50 dark:bg-blue-950/50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">0</p>
                  <p className="text-xs text-blue-600">Clientes</p>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-950/50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">0</p>
                  <p className="text-xs text-green-600">Faturas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Card de Alteração de Senha - Linha Separada */}
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base sm:text-lg">Segurança</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Altere sua senha de acesso</CardDescription>
              </div>
              {!isChangingPassword ? (
                <Button onClick={() => setIsChangingPassword(true)} variant="outline" size="sm" className="w-full sm:w-auto flex-shrink-0">
                  <Lock className="w-4 h-4 mr-2" />
                  Alterar Senha
                </Button>
              ) : (
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button onClick={handleChangePassword} size="sm" className="flex-1 sm:flex-initial">
                    <Save className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Salvar Senha</span>
                    <span className="sm:hidden">Salvar</span>
                  </Button>
                  <Button onClick={handleCancelPasswordChange} variant="outline" size="sm" className="flex-1 sm:flex-initial">
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          {isChangingPassword && (
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-1 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="current_password">Senha Atual</Label>
                  <Input
                    id="current_password"
                    type="password"
                    value={passwordData.current_password}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, current_password: e.target.value }))}
                    placeholder="Digite sua senha atual"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new_password">Nova Senha</Label>
                  <Input
                    id="new_password"
                    type="password"
                    value={passwordData.new_password}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, new_password: e.target.value }))}
                    placeholder="Digite a nova senha (mín. 6 caracteres)"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm_password">Confirmar Nova Senha</Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    value={passwordData.confirm_password}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirm_password: e.target.value }))}
                    placeholder="Confirme a nova senha"
                  />
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/50 rounded-lg">
                <Shield className="w-4 h-4 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <p className="font-medium">Dicas de segurança:</p>
                  <ul className="mt-1 text-xs space-y-1">
                    <li>• Use pelo menos 6 caracteres</li>
                    <li>• Combine letras, números e símbolos</li>
                    <li>• Não use informações pessoais</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Modal de Pagamento PIX para Renovação */}
      <Dialog open={showRenewalModal} onOpenChange={setShowRenewalModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Renovação via PIX</DialogTitle>
            <DialogDescription>
              Escaneie o QR Code ou copie o código PIX para renovar sua assinatura
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
                        console.error('Erro ao carregar QR Code');
                        e.currentTarget.style.display = 'none';
                      }}
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
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${
                    timeLeft < 300 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
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
                  <p className="mt-2">Após o pagamento, sua assinatura será renovada automaticamente por +30 dias</p>
                </div>
              </div>

              <Button
                className="w-full"
                variant="outline"
                onClick={() => {
                  setShowRenewalModal(false);
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