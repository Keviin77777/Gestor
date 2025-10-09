"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CheckCircle, Clock, AlertTriangle, XCircle, DollarSign, Calendar, FileText, Trash2, Ban, MoreHorizontal, Loader2, Check, X, Trash } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Client, Invoice } from "@/lib/definitions";
import { useInvoices } from "@/hooks/use-invoices";
import { mysqlApi } from "@/lib/mysql-api-client";
import { useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PaymentSuccessModal } from "@/components/payment-success-modal";

interface PaymentHistoryProps {
  client: Client;
  isOpen: boolean;
  onClose: () => void;
  onClientUpdate?: () => void; // Callback para refresh automático
}

export function PaymentHistory({ client, isOpen, onClose, onClientUpdate }: PaymentHistoryProps) {
  const { data: invoicesData, isLoading, markAsPaid, unmarkAsPaid, updateInvoice, deleteInvoice, refresh } = useInvoices({ client_id: client.id });
  const invoices = Array.isArray(invoicesData) ? invoicesData : [];
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);

  // Debug logging
  console.log('💳 PaymentHistory - Client ID:', client.id);
  console.log('💳 PaymentHistory - Invoices Data:', invoicesData);
  console.log('💳 PaymentHistory - Invoices Array:', invoices);
  console.log('💳 PaymentHistory - Is Loading:', isLoading);
  console.log('💳 PaymentHistory - Invoices Count:', invoices.length);

  const handleMarkAsPaid = async (invoiceId: string) => {
    try {
      setProcessingPayment(invoiceId);
      console.log('🔄 Marcando fatura como paga:', invoiceId);
      const result = await markAsPaid(invoiceId);
      console.log('✅ Resultado da marcação:', result);

      if (result.success) {
        // Preparar dados para o modal de sucesso
        const invoice = invoices.find(inv => inv.id === invoiceId);
        setSuccessData({
          client_name: client.name,
          new_renewal_date: result.new_renewal_date,
          sigma_renewed: result.sigma_renewed,
          sigma_response: result.sigma_response,
          invoice_id: invoiceId,
          value: invoice?.value || 0
        });

        // Mostrar modal de sucesso
        setShowSuccessModal(true);

        // Force refresh da lista de faturas
        console.log('🔄 Fazendo refresh da lista de faturas');
        refresh();

        // Refresh automático da listagem de clientes
        if (onClientUpdate) {
          console.log('🔄 Fazendo refresh dos dados do cliente');
          onClientUpdate();
        }
      } else {
        alert(`❌ Erro ao marcar fatura como paga: ${result.message}`);
      }
    } catch (error) {
      console.error('Error marking invoice as paid:', error);
      alert('❌ Erro ao marcar fatura como paga. Tente novamente.');
    } finally {
      setProcessingPayment(null);
    }
  };

  const handleUnmarkAsPaid = async (invoiceId: string) => {
    try {
      setProcessingPayment(invoiceId);
      console.log('🔄 Desmarcando fatura como paga e revertendo renovação:', invoiceId);
      
      // Usar a nova API de desmarcar com reversão automática
      const result = await unmarkAsPaid(invoiceId);
      console.log('✅ Resultado da desmarcação:', result);

      // Force refresh da lista de faturas
      refresh();

      // Callback para atualizar dados do cliente se necessário
      if (onClientUpdate) {
        onClientUpdate();
      }

      // Mostrar mensagem de sucesso com detalhes
      if (result.success) {
        let message = '✅ Fatura desmarcada como paga!';
        if (result.client_updated) {
          message += `\n📅 Data de vencimento revertida para: ${result.previous_renewal_date}`;
          message += '\n⚠️ Nota: Reversão no Sigma IPTV deve ser feita manualmente';
        }
        console.log(message);
      }
    } catch (error) {
      console.error('Error unmarking invoice as paid:', error);
      alert('❌ Erro ao desmarcar fatura como paga. Tente novamente.');
    } finally {
      setProcessingPayment(null);
    }
  };

  const handleCancelInvoice = async (invoiceId: string) => {
    try {
      setProcessingAction(invoiceId);
      
      // Usar apenas o hook para atualizar
      await updateInvoice(invoiceId, { status: 'cancelled' });

      // Force refresh da lista de faturas
      refresh();

      // Callback para atualizar dados do cliente se necessário
      if (onClientUpdate) {
        onClientUpdate();
      }

      console.log('✅ Fatura cancelada com sucesso!');
    } catch (error) {
      console.error('Error cancelling invoice:', error);
      alert('❌ Erro ao cancelar fatura. Tente novamente.');
    } finally {
      setProcessingAction(null);
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    try {
      setProcessingAction(invoiceId);

      await deleteInvoice(invoiceId);

      // Force refresh da lista de faturas silenciosamente
      setTimeout(() => {
        refresh();
      }, 100);

      // Callback para atualizar dados do cliente se necessário
      if (onClientUpdate) {
        setTimeout(() => {
          onClientUpdate();
        }, 200);
      }

      // Notificação elegante
      console.log('✅ Fatura excluída com sucesso!');
      
      // Importar e usar a notificação toast
      import('@/components/ui/toast-notification').then(({ showSuccessToast }) => {
        showSuccessToast('Fatura excluída com sucesso!');
      });

    } catch (error) {
      console.error('Error deleting invoice:', error);
      alert('❌ Erro ao excluir fatura. Tente novamente.');
    } finally {
      setProcessingAction(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'overdue':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-gray-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default" className="bg-green-100 text-green-800">Pago</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pendente</Badge>;
      case 'overdue':
        return <Badge variant="destructive">Vencido</Badge>;
      case 'cancelled':
        return <Badge variant="outline">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) {
      return 'N/A';
    }
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy', { locale: ptBR });
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return 'Data inválida';
    }
  };

  const totalValue = invoices.reduce((sum, invoice) => sum + invoice.value, 0);
  const paidValue = invoices
    .filter(invoice => invoice.status === 'paid')
    .reduce((sum, invoice) => sum + invoice.value, 0);
  const pendingValue = invoices
    .filter(invoice => invoice.status === 'pending')
    .reduce((sum, invoice) => sum + invoice.value, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl w-[95vw] max-h-[95vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
          <DialogTitle className="flex items-center gap-3 text-xl font-semibold">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Histórico de Pagamentos
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 font-normal">
                {client.name}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400 font-medium">Carregando faturas...</p>
                <p className="text-sm text-gray-500 mt-1">Aguarde um momento</p>
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Total de Faturas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">{invoices.length}</div>
                    <p className="text-xs text-muted-foreground">{formatCurrency(totalValue)}</p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Pagas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {invoices.filter(i => i.status === 'paid').length}
                    </div>
                    <p className="text-xs text-muted-foreground">{formatCurrency(paidValue)}</p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-yellow-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4 text-yellow-600" />
                      Pendentes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">
                      {invoices.filter(i => i.status === 'pending').length}
                    </div>
                    <p className="text-xs text-muted-foreground">{formatCurrency(pendingValue)}</p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-red-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      Canceladas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {invoices.filter(i => i.status === 'cancelled').length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(invoices.filter(i => i.status === 'cancelled').reduce((sum, invoice) => sum + invoice.value, 0))}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Invoices Table */}
              {invoices.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="bg-gray-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-10 w-10 text-gray-400" />
                  </div>
                  <p className="text-lg font-medium mb-2">Nenhuma fatura encontrada</p>
                  <p className="text-sm">Este cliente ainda não possui faturas registradas.</p>
                </div>
              ) : (
                <div className="border rounded-xl shadow-sm bg-white dark:bg-gray-900 overflow-hidden">
                  <div className="px-6 py-5 border-b bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Faturas do Cliente</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Gerencie as faturas e pagamentos de forma eficiente</p>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50/50 dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800">
                          <TableHead className="font-bold text-gray-900 dark:text-gray-100">Fatura</TableHead>
                          <TableHead className="font-bold text-gray-900 dark:text-gray-100 hidden sm:table-cell">Emissão</TableHead>
                          <TableHead className="font-bold text-gray-900 dark:text-gray-100">Vencimento</TableHead>
                          <TableHead className="font-bold text-gray-900 dark:text-gray-100">Valor</TableHead>
                          <TableHead className="font-bold text-gray-900 dark:text-gray-100">Status</TableHead>
                          <TableHead className="font-bold text-gray-900 dark:text-gray-100 text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoices.map((invoice, index) => (
                          <TableRow key={invoice.id} className={`hover:bg-gray-50/50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/20'}`}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 shadow-sm"></div>
                                <div>
                                  <span className="font-mono text-sm font-bold text-gray-900 dark:text-gray-100">#{invoice.id.substring(0, 8)}</span>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 sm:hidden">
                                    {formatDate(invoice.due_date)}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{formatDate(invoice.issue_date)}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{formatDate(invoice.due_date)}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-green-600" />
                                <span className="font-bold text-green-700 dark:text-green-400 text-base">{formatCurrency(invoice.value)}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(invoice.status)}
                                {getStatusBadge(invoice.status)}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <TooltipProvider>
                                <div className="flex items-center justify-end gap-1">
                                  {/* Botão Marcar/Desmarcar como Pago */}
                                  {invoice.status === 'pending' ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="sm"
                                          onClick={() => handleMarkAsPaid(invoice.id)}
                                          disabled={processingPayment === invoice.id}
                                          className="bg-green-600 hover:bg-green-700 text-white h-7 w-7 p-0 rounded-md shadow-sm transition-all duration-200 hover:shadow-md"
                                        >
                                          {processingPayment === invoice.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : (
                                            <Check className="h-4 w-4" />
                                          )}
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Marcar como Pago</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  ) : invoice.status === 'paid' ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="sm"
                                          onClick={() => handleUnmarkAsPaid(invoice.id)}
                                          disabled={processingPayment === invoice.id}
                                          variant="outline"
                                          className="border-orange-500 text-orange-600 hover:bg-orange-50 h-7 w-7 p-0 rounded-md shadow-sm transition-all duration-200 hover:shadow-md"
                                        >
                                          {processingPayment === invoice.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : (
                                            <X className="h-4 w-4" />
                                          )}
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Desmarcar como Pago</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  ) : null}

                                  {/* Botão Cancelar - apenas para faturas pendentes */}
                                  {invoice.status === 'pending' && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="sm"
                                          onClick={() => handleCancelInvoice(invoice.id)}
                                          disabled={processingAction === invoice.id}
                                          variant="outline"
                                          className="border-orange-500 text-orange-600 hover:bg-orange-50 h-7 w-7 p-0 rounded-md shadow-sm transition-all duration-200 hover:shadow-md"
                                        >
                                          {processingAction === invoice.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : (
                                            <Ban className="h-4 w-4" />
                                          )}
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Cancelar Fatura</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}

                                  {/* Botão Excluir - para todas as faturas */}
                                  <AlertDialog>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <AlertDialogTrigger asChild>
                                          <Button
                                            size="sm"
                                            disabled={processingAction === invoice.id}
                                            variant="outline"
                                            className="border-red-500 text-red-600 hover:bg-red-50 h-7 w-7 p-0 rounded-md shadow-sm transition-all duration-200 hover:shadow-md"
                                          >
                                            {processingAction === invoice.id ? (
                                              <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                              <Trash className="h-4 w-4" />
                                            )}
                                          </Button>
                                        </AlertDialogTrigger>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Excluir Fatura</p>
                                      </TooltipContent>
                                    </Tooltip>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Tem certeza que deseja excluir esta fatura? Esta ação não pode ser desfeita.
                                          <br />
                                          <br />
                                          <strong>Fatura:</strong> #{invoice.id.substring(0, 8)}
                                          <br />
                                          <strong>Valor:</strong> {formatCurrency(invoice.value)}
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleDeleteInvoice(invoice.id)}
                                          className="bg-red-600 hover:bg-red-700"
                                        >
                                          Excluir
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </TooltipProvider>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>

      {/* Modal de Sucesso do Pagamento */}
      {showSuccessModal && successData && (
        <PaymentSuccessModal
          isOpen={showSuccessModal}
          onClose={() => {
            setShowSuccessModal(false);
            setSuccessData(null);
          }}
          data={successData}
        />
      )}
    </Dialog>
  );
}