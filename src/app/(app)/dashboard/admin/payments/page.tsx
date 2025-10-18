'use client';

import { useAdminPayments } from '@/hooks/use-admin-payments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Clock, CheckCircle, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AdminPaymentsPage() {
  const { data, loading, error, refetch } = useAdminPayments();

  const handleClearAllHistory = async () => {
    if (!confirm('⚠️ ATENÇÃO: Isso vai deletar TODOS os pagamentos de TODAS as revendas!\n\nTem certeza? Esta ação não pode ser desfeita.')) {
      return;
    }

    if (!confirm('Última confirmação: Deletar TODO o histórico de pagamentos?')) {
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_PHP_API_URL || 'http://localhost:8080';
      console.log('🗑️ Iniciando limpeza TOTAL do histórico...');
      
      const response = await fetch(`/api/admin-clear-payments`, {
        method: 'POST',
        credentials: 'include',
      });

      console.log('📥 Resposta da API:', response.status, response.statusText);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Resultado:', result);
        alert('✅ Todo o histórico foi limpo com sucesso!');
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500">Pago</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500">Pendente</Badge>;
      case 'expired':
        return <Badge className="bg-red-500">Expirado</Badge>;
      case 'failed':
        return <Badge className="bg-red-500">Falhou</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-500">{error || 'Erro ao carregar dados'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { payments, stats } = data;
  const pendingPayments = payments.filter((p: any) => p.status === 'pending');
  const paidPayments = payments.filter((p: any) => p.status === 'paid');
  const expiredPayments = payments.filter((p: any) => p.status === 'expired');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pagamentos de Assinaturas</h1>
          <p className="text-muted-foreground">Gerencie os pagamentos dos revendas</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleClearAllHistory}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            Limpar Tudo
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Cards de Totais */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pendente</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {formatCurrency(stats.total_pending_amount)}
            </div>
            <p className="text-xs text-muted-foreground">{stats.pending_count} pagamentos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pago</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.total_paid_amount)}
            </div>
            <p className="text-xs text-muted-foreground">{stats.paid_count} pagamentos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expirados</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.expired_count}</div>
            <p className="text-xs text-muted-foreground">pagamentos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Geral</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payments.length}</div>
            <p className="text-xs text-muted-foreground">pagamentos</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">
            Todos ({payments.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pendentes ({pendingPayments.length})
          </TabsTrigger>
          <TabsTrigger value="paid">
            Pagos ({paidPayments.length})
          </TabsTrigger>
          <TabsTrigger value="expired">
            Expirados ({expiredPayments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingPayments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Nenhum pagamento pendente
              </CardContent>
            </Card>
          ) : (
            pendingPayments.map((payment: any) => (
              <Card key={payment.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-semibold">{payment.reseller_name}</p>
                      <p className="text-sm text-muted-foreground">{payment.reseller_email}</p>
                      <p className="text-sm">
                        <span className="font-medium">{payment.plan_name}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Criado: {format(new Date(payment.payment_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <div className="text-right space-y-2">
                      <p className="text-2xl font-bold text-yellow-600">
                        {formatCurrency(Number(payment.amount))}
                      </p>
                      {getStatusBadge(payment.status)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="paid" className="space-y-4">
          {paidPayments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Nenhum pagamento confirmado
              </CardContent>
            </Card>
          ) : (
            paidPayments.map((payment: any) => (
              <Card key={payment.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-semibold">{payment.reseller_name}</p>
                      <p className="text-sm text-muted-foreground">{payment.reseller_email}</p>
                      <p className="text-sm">
                        <span className="font-medium">{payment.plan_name}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Pago: {payment.payment_date ? format(new Date(payment.payment_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'N/A'}
                      </p>
                    </div>
                    <div className="text-right space-y-2">
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(Number(payment.amount))}
                      </p>
                      {getStatusBadge(payment.status)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="expired" className="space-y-4">
          {expiredPayments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Nenhum pagamento expirado
              </CardContent>
            </Card>
          ) : (
            expiredPayments.map((payment: any) => (
              <Card key={payment.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-semibold">{payment.reseller_name}</p>
                      <p className="text-sm text-muted-foreground">{payment.reseller_email}</p>
                      <p className="text-sm">
                        <span className="font-medium">{payment.plan_name}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Expirou: {payment.expires_at ? format(new Date(payment.expires_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'N/A'}
                      </p>
                    </div>
                    <div className="text-right space-y-2">
                      <p className="text-2xl font-bold text-red-600">
                        {formatCurrency(Number(payment.amount))}
                      </p>
                      {getStatusBadge(payment.status)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          {payments.map((payment: any) => (
            <Card key={payment.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-semibold">{payment.reseller_name}</p>
                    <p className="text-sm text-muted-foreground">{payment.reseller_email}</p>
                    <p className="text-sm">
                      <span className="font-medium">{payment.plan_name}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(payment.payment_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="text-right space-y-2">
                    <p className="text-2xl font-bold">
                      {formatCurrency(Number(payment.amount))}
                    </p>
                    {getStatusBadge(payment.status)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
