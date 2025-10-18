'use client';

import { useState, useEffect } from 'react';
import { usePaymentMethods, type PaymentMethod } from '@/hooks/use-payment-methods';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  method?: PaymentMethod | null;
  onSuccess: () => void;
}

export function PaymentMethodModal({ isOpen, onClose, method, onSuccess }: PaymentMethodModalProps) {
  const { createPaymentMethod, updatePaymentMethod } = usePaymentMethods();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  
  const [methodType, setMethodType] = useState<'mercadopago' | 'asaas'>('mercadopago');
  const [isActive, setIsActive] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  
  // Mercado Pago
  const [mpPublicKey, setMpPublicKey] = useState('');
  const [mpAccessToken, setMpAccessToken] = useState('');
  
  // Asaas
  const [asaasApiKey, setAsaasApiKey] = useState('');
  const [asaasPixKey, setAsaasPixKey] = useState('');
  const [asaasWebhookUrl, setAsaasWebhookUrl] = useState('');
  


  useEffect(() => {
    const loadMethodData = async () => {
      if (method && isOpen) {
        setIsLoadingData(true);
        try {
          // Buscar dados completos (não mascarados) do método via API
          const response = await fetch(`/api/payment-methods/${method.id}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
          });

          if (!response.ok) {
            throw new Error('Failed to fetch payment method details');
          }

          const fullMethod = await response.json();
          
          setMethodType(fullMethod.method_type);
          setIsActive(fullMethod.is_active);
          setIsDefault(fullMethod.is_default);
          
          // Mercado Pago
          setMpPublicKey(fullMethod.mp_public_key || '');
          setMpAccessToken(fullMethod.mp_access_token || '');
          
          // Asaas
          setAsaasApiKey(fullMethod.asaas_api_key || '');
          setAsaasPixKey(fullMethod.asaas_pix_key || '');
          setAsaasWebhookUrl(fullMethod.asaas_webhook_url || `${window.location.origin}/api/webhooks/asaas`);
        } catch (error) {
          console.error('Error loading payment method:', error);
          toast({
            title: 'Erro',
            description: 'Erro ao carregar dados do método. Tente novamente.',
            variant: 'destructive',
          });
          onClose(); // Fechar modal em caso de erro
        } finally {
          setIsLoadingData(false);
        }
      } else if (!method && isOpen) {
        // Reset form para novo método
        setIsLoadingData(false);
        setMethodType('mercadopago');
        setIsActive(true);
        setIsDefault(false);
        setMpPublicKey('');
        setMpAccessToken('');
        setAsaasApiKey('');
        setAsaasPixKey('');
        
        // Generate webhook URL
        if (typeof window !== 'undefined') {
          setAsaasWebhookUrl(`${window.location.origin}/api/webhooks/asaas`);
        }
      }
    };

    if (isOpen) {
      loadMethodData();
    }
  }, [method?.id, isOpen, toast, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const data: Partial<PaymentMethod> = {
        method_type: methodType,
        is_active: isActive,
        is_default: isDefault,
      };

      if (methodType === 'mercadopago') {
        if (!mpPublicKey || !mpAccessToken) {
          throw new Error('Preencha todos os campos do Mercado Pago');
        }
        data.mp_public_key = mpPublicKey;
        data.mp_access_token = mpAccessToken;
      } else if (methodType === 'asaas') {
        if (!asaasApiKey || !asaasPixKey) {
          throw new Error('Preencha todos os campos do Asaas');
        }
        data.asaas_api_key = asaasApiKey;
        data.asaas_pix_key = asaasPixKey;
        data.asaas_webhook_url = asaasWebhookUrl;
      }

      if (method) {
        await updatePaymentMethod(method.id, data);
        toast({
          title: 'Sucesso',
          description: 'Método de pagamento atualizado',
        });
      } else {
        await createPaymentMethod(data);
        toast({
          title: 'Sucesso',
          description: 'Método de pagamento criado',
        });
      }

      onSuccess();
      onClose();
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao salvar método',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {method ? 'Editar' : 'Adicionar'} Método de Pagamento
          </DialogTitle>
          <DialogDescription>
            Configure como seus clientes irão pagar as faturas
          </DialogDescription>
        </DialogHeader>

        {isLoadingData ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando dados...</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Método Ativo</Label>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>

            <div className="flex items-center justify-between">
              <Label>Método Padrão</Label>
              <Switch checked={isDefault} onCheckedChange={setIsDefault} />
            </div>
          </div>

          <Tabs value={methodType} onValueChange={(v) => setMethodType(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="mercadopago">Mercado Pago</TabsTrigger>
              <TabsTrigger value="asaas">Asaas</TabsTrigger>
            </TabsList>

            <TabsContent value="mercadopago" className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Como obter as credenciais:</strong>
                  <ol className="list-decimal ml-4 mt-2 space-y-1 text-sm">
                    <li>Acesse <a href="https://www.mercadopago.com.br/developers" target="_blank" className="text-blue-600 underline">Mercado Pago Developers</a></li>
                    <li>Faça login na sua conta</li>
                    <li>Vá em "Suas integrações" → "Credenciais"</li>
                    <li>Copie a "Public Key" e o "Access Token" de produção</li>
                  </ol>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="mp_public_key">Public Key *</Label>
                <Input
                  id="mp_public_key"
                  placeholder={method && !mpPublicKey ? "Carregando..." : "APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"}
                  value={mpPublicKey}
                  onChange={(e) => setMpPublicKey(e.target.value)}
                  required={methodType === 'mercadopago' && !method}
                  disabled={isLoadingData}
                />
                {method && mpPublicKey && (
                  <p className="text-xs text-muted-foreground">
                    ✅ Configurado - Deixe em branco para manter o valor atual
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="mp_access_token">Access Token *</Label>
                <Input
                  id="mp_access_token"
                  type="password"
                  placeholder={method && !mpAccessToken ? "Carregando..." : "APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"}
                  value={mpAccessToken}
                  onChange={(e) => setMpAccessToken(e.target.value)}
                  required={methodType === 'mercadopago' && !method}
                  disabled={isLoadingData}
                />
                {method && mpAccessToken && (
                  <p className="text-xs text-muted-foreground">
                    ✅ Configurado - Deixe em branco para manter o valor atual
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="asaas" className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Como obter as credenciais:</strong>
                  <ol className="list-decimal ml-4 mt-2 space-y-1 text-sm">
                    <li>Acesse <a href="https://www.asaas.com" target="_blank" className="text-blue-600 underline">Asaas</a></li>
                    <li>Faça login na sua conta</li>
                    <li>Vá em "Integrações" → "API Key"</li>
                    <li>Copie sua API Key de produção</li>
                    <li>Configure o webhook abaixo na sua conta Asaas</li>
                  </ol>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="asaas_api_key">API Key *</Label>
                <Input
                  id="asaas_api_key"
                  type="password"
                  placeholder="$aact_YTU5YTE0M2M2N2I4MTliNzk0YTI5N2U5MzdjNWZmNDQ6OjAwMDAwMDAwMDAwMDAwMDAwMDA6OiRhYWNoXzRlNTU="
                  value={asaasApiKey}
                  onChange={(e) => setAsaasApiKey(e.target.value)}
                  required={methodType === 'asaas'}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="asaas_pix_key">Chave PIX *</Label>
                <Input
                  id="asaas_pix_key"
                  placeholder="sua@chave.pix"
                  value={asaasPixKey}
                  onChange={(e) => setAsaasPixKey(e.target.value)}
                  required={methodType === 'asaas'}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="asaas_webhook_url">Webhook URL (Configure no Asaas)</Label>
                <Input
                  id="asaas_webhook_url"
                  value={asaasWebhookUrl}
                  readOnly
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Cole esta URL nas configurações de webhook da sua conta Asaas
                </p>
              </div>
            </TabsContent>


          </Tabs>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando...' : method ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
