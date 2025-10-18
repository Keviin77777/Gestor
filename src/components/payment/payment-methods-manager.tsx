'use client';

import { useState } from 'react';
import { usePaymentMethods, type PaymentMethod } from '@/hooks/use-payment-methods';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, CreditCard, Trash2, Edit, Check } from 'lucide-react';
import { PaymentMethodModal } from './payment-method-modal';
import { useToast } from '@/hooks/use-toast';

export function PaymentMethodsManager() {
  const { data: methods, isLoading, deletePaymentMethod, updatePaymentMethod, refresh } = usePaymentMethods();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const { toast } = useToast();

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este método de pagamento?')) return;

    try {
      await deletePaymentMethod(id);
      toast({
        title: 'Sucesso',
        description: 'Método de pagamento excluído',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao excluir método',
        variant: 'destructive',
      });
    }
  };

  const handleToggleActive = async (method: PaymentMethod) => {
    try {
      await updatePaymentMethod(method.id, { is_active: !method.is_active });
      toast({
        title: 'Sucesso',
        description: `Método ${method.is_active ? 'desativado' : 'ativado'}`,
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar método',
        variant: 'destructive',
      });
    }
  };

  const handleSetDefault = async (method: PaymentMethod) => {
    try {
      await updatePaymentMethod(method.id, { is_default: true });
      toast({
        title: 'Sucesso',
        description: 'Método definido como padrão',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao definir método padrão',
        variant: 'destructive',
      });
    }
  };

  const getMethodIcon = (type: string) => {
    switch (type) {
      case 'mercadopago':
        return '💳';
      case 'asaas':
        return '🏦';
      default:
        return '💰';
    }
  };

  const getMethodName = (type: string) => {
    switch (type) {
      case 'mercadopago':
        return 'Mercado Pago';
      case 'asaas':
        return 'Asaas';
      default:
        return type;
    }
  };

  if (isLoading) {
    return <div className="p-4">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Métodos de Pagamento</h2>
          <p className="text-muted-foreground">
            Configure como seus clientes irão pagar as faturas
          </p>
        </div>
        <Button onClick={() => {
          setEditingMethod(null);
          setIsModalOpen(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Método
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {methods.map((method) => (
          <Card key={method.id} className={!method.is_active ? 'opacity-60' : ''}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getMethodIcon(method.method_type)}</span>
                  <div>
                    <CardTitle className="text-lg">{getMethodName(method.method_type)}</CardTitle>
                    <CardDescription className="text-xs">
                      {method.is_default && (
                        <Badge variant="default" className="mr-1">Padrão</Badge>
                      )}
                      {method.is_active ? (
                        <Badge variant="outline" className="bg-green-50">Ativo</Badge>
                      ) : (
                        <Badge variant="outline">Inativo</Badge>
                      )}
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {method.method_type === 'mercadopago' && (
                  <>
                    <div>
                      <span className="text-muted-foreground">Public Key:</span>
                      <p className="font-mono text-xs">{method.mp_public_key_masked}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Access Token:</span>
                      <p className="font-mono text-xs">{method.mp_access_token_masked}</p>
                    </div>
                  </>
                )}

                {method.method_type === 'asaas' && (
                  <>
                    <div>
                      <span className="text-muted-foreground">API Key:</span>
                      <p className="font-mono text-xs">{method.asaas_api_key_masked}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Chave PIX:</span>
                      <p className="font-mono text-xs">{method.asaas_pix_key}</p>
                    </div>
                  </>
                )}


              </div>

              <div className="flex gap-2 mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingMethod(method);
                    setIsModalOpen(true);
                  }}
                >
                  <Edit className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleToggleActive(method)}
                >
                  {method.is_active ? 'Desativar' : 'Ativar'}
                </Button>
                {!method.is_default && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSetDefault(method)}
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Padrão
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(method.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {methods.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CreditCard className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Nenhum método de pagamento configurado
              </p>
              <Button onClick={() => setIsModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Primeiro Método
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <PaymentMethodModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingMethod(null);
        }}
        method={editingMethod}
        onSuccess={refresh}
      />
    </div>
  );
}
