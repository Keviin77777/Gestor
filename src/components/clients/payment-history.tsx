"use client";

import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Circle, Plus, Trash2, CheckCircle } from "lucide-react";
import { useFirebase, useMemoFirebase } from "@/firebase";
import { useCollection } from "@/firebase/firestore/use-collection";
import { collection, doc, deleteDoc } from "firebase/firestore";
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import type { Client, Invoice } from "@/lib/definitions";
import { format, parseISO, differenceInDays, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSigmaIntegration } from "@/hooks/use-sigma-integration";

interface PaymentHistoryProps {
  client: Client;
  isOpen: boolean;
  onClose: () => void;
}

export function PaymentHistory({ client, isOpen, onClose }: PaymentHistoryProps) {
  const { firestore, user } = useFirebase();
  const resellerId = user?.uid;
  
  // Sigma Integration
  const sigmaIntegration = useSigmaIntegration();

  // Modal states
  const [confirmGenerateOpen, setConfirmGenerateOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [nextPeriodToGenerate, setNextPeriodToGenerate] = useState("");
  
  // Sigma template states
  const [sigmaTemplate, setSigmaTemplate] = useState<string>("");
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Collections
  const invoicesCollection = useMemoFirebase(() => {
    if (!resellerId) return null;
    return collection(firestore, 'resellers', resellerId, 'invoices');
  }, [firestore, resellerId]);

  const plansCollection = useMemoFirebase(() => {
    if (!resellerId) return null;
    return collection(firestore, 'resellers', resellerId, 'plans');
  }, [firestore, resellerId]);

  const panelsCollection = useMemoFirebase(() => {
    if (!resellerId) return null;
    return collection(firestore, 'resellers', resellerId, 'panels');
  }, [firestore, resellerId]);

  const { data: allInvoices } = useCollection<Invoice>(invoicesCollection);
  const { data: plans } = useCollection(plansCollection);
  const { data: panels } = useCollection(panelsCollection);

  // Filter invoices for this client
  const clientInvoices = allInvoices?.filter(invoice => invoice.clientId === client.id) || [];

  // Generate invoice automatically if needed (7 days before due date)
  useEffect(() => {
    if (!resellerId || !invoicesCollection || !client || !allInvoices) return;

    const generateInvoiceIfNeeded = async () => {
      const today = new Date();
      const renewalDate = parseISO(client.renewalDate);
      const daysUntilRenewal = differenceInDays(renewalDate, today);

      // Check if we need to generate invoice (7 days or less before due date)
      if (daysUntilRenewal <= 7 && daysUntilRenewal >= 0) {
        // Check if invoice already exists for this exact due date and client
        const existingInvoice = allInvoices.find(invoice =>
          invoice.clientId === client.id &&
          invoice.dueDate === client.renewalDate &&
          invoice.resellerId === resellerId
        );

        if (!existingInvoice) {
          // Generate new invoice
          const newInvoice: Omit<Invoice, 'id'> = {
            clientId: client.id,
            resellerId,
            dueDate: client.renewalDate,
            issueDate: format(today, 'yyyy-MM-dd'),
            value: client.paymentValue,
            discount: (client as any).discountValue || 0,
            finalValue: client.paymentValue - ((client as any).discountValue || 0),
            status: 'pending',
            description: `Mensalidade - ${format(renewalDate, 'MMMM yyyy', { locale: ptBR })}`
          };

          addDocumentNonBlocking(invoicesCollection, newInvoice);
        }
      }
    };

    generateInvoiceIfNeeded();
  }, [client, allInvoices, invoicesCollection, resellerId]);

  const handleMarkAsPaid = async (invoice: Invoice) => {
    if (!resellerId || !firestore) return;

    const invoiceRef = doc(firestore, 'resellers', resellerId, 'invoices', invoice.id);
    const updatedInvoice: Partial<Invoice> = {
      status: 'paid',
      paymentDate: format(new Date(), 'yyyy-MM-dd'),
      paymentMethod: 'Manual'
    };

    updateDocumentNonBlocking(invoiceRef, updatedInvoice);

    // Update client renewal date: add 1 month to the invoice due date
    const clientRef = doc(firestore, 'resellers', resellerId, 'clients', client.id);
    const nextRenewalDate = addMonths(parseISO(invoice.dueDate), 1);
    updateDocumentNonBlocking(clientRef, {
      renewalDate: format(nextRenewalDate, 'yyyy-MM-dd')
    });

    // Auto-renew in Sigma if panel is connected and client has username
    if (client.username && plans && panels) {
      const clientPlan = plans.find((p: any) => p.id === client.planId);
      if (clientPlan) {
        const clientPanel = panels.find((p: any) => p.id === clientPlan.panelId);
        if (clientPanel?.sigmaConnected) {
          // Renew client in Sigma asynchronously
          console.log('Tentando renovar cliente no Sigma:', {
            username: client.username,
            planId: clientPlan.id,
            panelConnected: clientPanel.sigmaConnected,
            sigmaUserId: clientPanel.sigmaUserId
          });
          
          // Use the configured package ID from the panel, or fallback to default
          const sigmaPackageId = clientPanel.sigmaDefaultPackageId || "BV4D3rLaqZ";
          // First renew the client (extends the subscription)
          sigmaIntegration.renewClient(clientPanel, client.username, sigmaPackageId)
            .then(result => {
              if (result.success) {
                console.log('✅ Cliente renovado automaticamente no Sigma IPTV');
                
                // Extract and show the confirmation template
                console.log('Verificando template do Sigma:', result);
                
                // The template comes in result.data.data.customer_renew_confirmation_template
                const template = result.data?.data?.customer_renew_confirmation_template || 
                               result.data?.customer_renew_confirmation_template;
                
                if (template) {
                  console.log('Template encontrado:', template);
                  setSigmaTemplate(template);
                  setShowTemplateModal(true);
                  console.log('Modal do template ativado');
                } else {
                  console.log('Template não encontrado na resposta');
                  console.log('Estrutura da resposta:', JSON.stringify(result, null, 2));
                  
                  // Fallback: Create a basic template if none is provided
                  const fallbackTemplate = `*Confirmação de Renovação*

✅ Cliente: ${client.name}
📱 Usuário: ${client.username}
🗓️ Renovação realizada com sucesso!

Entre em contato se tiver dúvidas.`;
                  
                  setSigmaTemplate(fallbackTemplate);
                  setShowTemplateModal(true);
                  console.log('Usando template de fallback');
                }
                
                // Then ensure client is marked as ACTIVE
                if (client.username) {
                  return sigmaIntegration.updateClientStatus(clientPanel, client.username, 'ACTIVE');
                }
                return Promise.resolve({ success: true, data: null });
              } else {
                console.error('❌ Erro ao renovar cliente no Sigma:', result.error);
                console.error('Dados enviados:', { 
                  username: client.username, 
                  packageId: sigmaPackageId,
                  userId: clientPanel.sigmaUserId 
                });
                throw new Error(result.error);
              }
            })
            .then(statusResult => {
              if (statusResult && statusResult.success) {
                console.log('✅ Status do cliente atualizado para ATIVO no Sigma');
              } else if (statusResult && !statusResult.success) {
                console.error('❌ Erro ao ativar cliente no Sigma:', statusResult.error);
              }
            })
            .catch(error => {
              console.error('❌ Erro na sincronização com Sigma:', error);
            });
        }
      }
    }
  };

  const handleMarkAsUnpaid = async (invoice: Invoice) => {
    if (!resellerId || !firestore) return;

    const invoiceRef = doc(firestore, 'resellers', resellerId, 'invoices', invoice.id);
    const updatedInvoice: Partial<Invoice> = {
      status: 'pending'
    };

    updateDocumentNonBlocking(invoiceRef, updatedInvoice);

    // Calculate the correct renewal date based on remaining paid invoices
    const calculateCorrectRenewalDate = () => {
      // Get all paid invoices for this client (excluding the one we just unmarked)
      const paidInvoices = clientInvoices
        .filter(inv => inv.id !== invoice.id && inv.status === 'paid')
        .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());

      if (paidInvoices.length > 0) {
        // If there are other paid invoices, set renewal to 1 month after the most recent paid invoice
        const mostRecentPaidInvoice = paidInvoices[0];
        return format(addMonths(parseISO(mostRecentPaidInvoice.dueDate), 1), 'yyyy-MM-dd');
      } else {
        // If no paid invoices remain, find the oldest unpaid invoice (including the one we just unmarked)
        const unpaidInvoices = clientInvoices
          .filter(inv => inv.id === invoice.id || inv.status === 'pending')
          .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

        if (unpaidInvoices.length > 0) {
          // Set renewal to the oldest unpaid invoice date
          return unpaidInvoices[0].dueDate;
        } else {
          // Fallback to the invoice we just unmarked
          return invoice.dueDate;
        }
      }
    };

    // Update client renewal date
    const clientRef = doc(firestore, 'resellers', resellerId, 'clients', client.id);
    const newRenewalDate = calculateCorrectRenewalDate();
    updateDocumentNonBlocking(clientRef, {
      renewalDate: newRenewalDate
    });

    // Auto-sync status in Sigma if panel is connected and client has username
    if (client.username && plans && panels) {
      const clientPlan = plans.find((p: any) => p.id === client.planId);
      if (clientPlan) {
        const clientPanel = panels.find((p: any) => p.id === clientPlan.panelId);
        if (clientPanel?.sigmaConnected) {
          console.log('Sincronizando status no Sigma após desmarcar fatura:', {
            username: client.username,
            newRenewalDate: newRenewalDate,
            panelConnected: clientPanel.sigmaConnected
          });

          // Calculate how many months to subtract from Sigma
          const originalRenewalDate = new Date(client.renewalDate);
          const newRenewalDateObj = new Date(newRenewalDate);
          const monthsDifference = (originalRenewalDate.getFullYear() - newRenewalDateObj.getFullYear()) * 12 + 
                                 (originalRenewalDate.getMonth() - newRenewalDateObj.getMonth());

          console.log('Calculando ajuste de data no Sigma:', {
            originalDate: client.renewalDate,
            newDate: newRenewalDate,
            monthsToSubtract: monthsDifference
          });

          // Limitation: Sigma API doesn't support subtracting time, only adding
          // We can only update the status (ACTIVE/INACTIVE) based on the new date
          const today = new Date();
          const renewalDate = new Date(newRenewalDate);
          const isExpired = renewalDate < today;
          const sigmaStatus = isExpired ? 'INACTIVE' : 'ACTIVE';

          console.log(`📋 Limitação do Sigma: Não é possível subtrair tempo da assinatura.`);
          console.log(`📋 Ação: Atualizando apenas o status para ${sigmaStatus} baseado na nova data.`);
          
          if (monthsDifference > 0) {
            console.log(`⚠️ ATENÇÃO: Cliente tem ${monthsDifference} mês(es) a mais no Sigma do que deveria.`);
            console.log(`⚠️ Recomendação: Ajuste manual no painel Sigma se necessário.`);
          }

          // Update client status in Sigma asynchronously
          if (client.username) {
            sigmaIntegration.updateClientStatus(clientPanel, client.username, sigmaStatus)
            .then(result => {
              if (result.success) {
                console.log(`✅ Status do cliente atualizado no Sigma para: ${sigmaStatus}`);
              } else {
                console.error('❌ Erro ao atualizar status no Sigma:', result.error);
              }
            })
            .catch(error => {
              console.error('❌ Erro ao atualizar status no Sigma:', error);
            });
          }
        }
      }
    }
  };

  const handleGenerateInvoice = async () => {
    if (!resellerId || !invoicesCollection || !client) return;

    // Determine the target date for the new invoice
    const getTargetDueDate = () => {
      let currentDate = parseISO(client.renewalDate);

      // Keep checking months until we find one without an invoice
      while (true) {
        const dateString = format(currentDate, 'yyyy-MM-dd');
        const existingInvoice = clientInvoices.find(invoice => invoice.dueDate === dateString);

        if (!existingInvoice) {
          // Found a month without an invoice
          return dateString;
        }

        // Move to next month
        currentDate = addMonths(currentDate, 1);

        // Safety check to prevent infinite loop (max 24 months ahead)
        const monthsAhead = differenceInDays(currentDate, parseISO(client.renewalDate)) / 30;
        if (monthsAhead > 24) {
          break;
        }
      }

      // Fallback (shouldn't reach here normally)
      return format(addMonths(parseISO(client.renewalDate), 1), 'yyyy-MM-dd');
    };

    const targetDueDate = getTargetDueDate();
    const targetDate = parseISO(targetDueDate);
    const periodName = format(targetDate, 'MMMM yyyy', { locale: ptBR });

    // Check if invoice already exists for the target date
    const existingInvoice = clientInvoices.find(invoice =>
      invoice.dueDate === targetDueDate
    );

    if (existingInvoice) {
      alert(`Já existe uma fatura para ${periodName}!`);
      return;
    }

    // Show confirmation modal
    setNextPeriodToGenerate(periodName);
    setConfirmGenerateOpen(true);
  };

  // Helper function to get the next invoice period that would be generated
  const getNextInvoicePeriod = () => {
    let currentDate = parseISO(client.renewalDate);

    // Keep checking months until we find one without an invoice
    while (true) {
      const dateString = format(currentDate, 'yyyy-MM-dd');
      const existingInvoice = clientInvoices.find(invoice => invoice.dueDate === dateString);

      if (!existingInvoice) {
        // Found a month without an invoice
        return format(currentDate, 'MMMM yyyy', { locale: ptBR });
      }

      // Move to next month
      currentDate = addMonths(currentDate, 1);

      // Safety check to prevent infinite loop (max 24 months ahead)
      const monthsAhead = differenceInDays(currentDate, parseISO(client.renewalDate)) / 30;
      if (monthsAhead > 24) {
        break;
      }
    }

    // Fallback
    return format(addMonths(parseISO(client.renewalDate), 1), 'MMMM yyyy', { locale: ptBR });
  };

  const handleDeleteInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setConfirmDeleteOpen(true);
  };

  const confirmDeleteInvoice = async () => {
    if (!resellerId || !firestore || !selectedInvoice) return;

    try {
      const invoiceRef = doc(firestore, 'resellers', resellerId, 'invoices', selectedInvoice.id);
      await deleteDoc(invoiceRef);

      // If the deleted invoice was paid, we need to recalculate the client's renewal date
      if (selectedInvoice.status === 'paid') {
        const remainingPaidInvoices = clientInvoices
          .filter(inv => inv.id !== selectedInvoice.id && inv.status === 'paid')
          .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());

        const clientRef = doc(firestore, 'resellers', resellerId, 'clients', client.id);

        if (remainingPaidInvoices.length > 0) {
          // Set renewal to 1 month after the most recent remaining paid invoice
          const mostRecentPaidInvoice = remainingPaidInvoices[0];
          const newRenewalDate = format(addMonths(parseISO(mostRecentPaidInvoice.dueDate), 1), 'yyyy-MM-dd');
          updateDocumentNonBlocking(clientRef, { renewalDate: newRenewalDate });
        } else {
          // If no paid invoices remain, find the oldest unpaid invoice
          const remainingUnpaidInvoices = clientInvoices
            .filter(inv => inv.id !== selectedInvoice.id && inv.status === 'pending')
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

          if (remainingUnpaidInvoices.length > 0) {
            // Set renewal to the oldest unpaid invoice date
            updateDocumentNonBlocking(clientRef, { renewalDate: remainingUnpaidInvoices[0].dueDate });
          } else {
            // Fallback to the deleted invoice date (shouldn't happen normally)
            updateDocumentNonBlocking(clientRef, { renewalDate: selectedInvoice.dueDate });
          }
        }
      }

      setConfirmDeleteOpen(false);
      setSelectedInvoice(null);
    } catch (error) {
      console.error('Error deleting invoice:', error);
    }
  };

  const confirmGenerateInvoice = async () => {
    if (!resellerId || !invoicesCollection || !client) return;

    // Get the target date info again using the same logic
    const getTargetDueDate = () => {
      let currentDate = parseISO(client.renewalDate);

      // Keep checking months until we find one without an invoice
      while (true) {
        const dateString = format(currentDate, 'yyyy-MM-dd');
        const existingInvoice = clientInvoices.find(invoice => invoice.dueDate === dateString);

        if (!existingInvoice) {
          // Found a month without an invoice
          return dateString;
        }

        // Move to next month
        currentDate = addMonths(currentDate, 1);

        // Safety check to prevent infinite loop (max 24 months ahead)
        const monthsAhead = differenceInDays(currentDate, parseISO(client.renewalDate)) / 30;
        if (monthsAhead > 24) {
          break;
        }
      }

      // Fallback
      return format(addMonths(parseISO(client.renewalDate), 1), 'yyyy-MM-dd');
    };

    const targetDueDate = getTargetDueDate();

    // Generate new invoice
    const newInvoice: Omit<Invoice, 'id'> = {
      clientId: client.id,
      resellerId,
      dueDate: targetDueDate,
      issueDate: format(new Date(), 'yyyy-MM-dd'),
      value: client.paymentValue,
      discount: (client as any).discountValue || 0,
      finalValue: client.paymentValue - ((client as any).discountValue || 0),
      status: 'pending',
      description: `Mensalidade - ${nextPeriodToGenerate}`
    };

    addDocumentNonBlocking(invoicesCollection, newInvoice);
    setConfirmGenerateOpen(false);
  };

  const getStatusBadge = (status: Invoice['status']) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Pago</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Vencido</Badge>;
      default:
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Pendente</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            {/* Desktop Header */}
            <div className="hidden md:flex items-center justify-between pr-8">
              <div className="flex-1">
                <DialogTitle className="text-xl font-bold">
                  Histórico de faturas de <span className="text-blue-600">{client.name}</span>
                </DialogTitle>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-right">
                  <div className="text-xs text-slate-500">Próximo período:</div>
                  <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {getNextInvoicePeriod()}
                  </div>
                </div>
                <Button
                  onClick={handleGenerateInvoice}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Gerar Fatura
                </Button>
              </div>
            </div>

            {/* Mobile Header */}
            <div className="md:hidden space-y-4">
              <DialogTitle className="text-lg font-bold">
                Histórico de faturas de <span className="text-blue-600">{client.name}</span>
              </DialogTitle>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Próximo período:</div>
                  <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {getNextInvoicePeriod()}
                  </div>
                </div>
                <Button
                  onClick={handleGenerateInvoice}
                  className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Gerar Fatura
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="mt-6">
            {clientInvoices.length > 0 ? (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-100 dark:bg-slate-800">
                        <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                          Vencimento:
                        </TableHead>
                        <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                          Desconto:
                        </TableHead>
                        <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                          Valor:
                        </TableHead>
                        <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                          Status:
                        </TableHead>
                        <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-center">
                          Ações:
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clientInvoices
                        .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
                        .map((invoice) => (
                          <TableRow key={invoice.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <TableCell>
                              <div className="bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded-lg">
                                <span className="text-blue-800 dark:text-blue-200 font-medium text-sm">
                                  {formatDate(invoice.dueDate)}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg">
                                <span className="text-slate-700 dark:text-slate-300 font-medium">
                                  R$ {invoice.discount.toFixed(2)}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-lg">
                                <span className="text-green-800 dark:text-green-200 font-bold">
                                  R$ {invoice.finalValue.toFixed(2)}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(invoice.status)}
                              {invoice.paymentDate && (
                                <div className="text-xs text-slate-500 mt-1">
                                  Pago em: {formatDate(invoice.paymentDate)}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-2">
                                {invoice.status === 'paid' ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleMarkAsUnpaid(invoice)}
                                    className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                                    title="Marcar como não pago"
                                  >
                                    <Circle className="h-4 w-4" />
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleMarkAsPaid(invoice)}
                                    className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                                    title="Marcar como pago"
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteInvoice(invoice)}
                                  className="bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200"
                                  title="Excluir fatura"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                  {clientInvoices
                    .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
                    .map((invoice) => (
                      <div key={invoice.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 shadow-sm">
                        {/* Header com data e status */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="bg-blue-100 dark:bg-blue-900/30 px-3 py-1.5 rounded-lg">
                            <span className="text-blue-800 dark:text-blue-200 font-semibold text-sm">
                              {formatDate(invoice.dueDate)}
                            </span>
                          </div>
                          {getStatusBadge(invoice.status)}
                        </div>

                        {/* Informações financeiras */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Desconto</div>
                            <div className="text-slate-700 dark:text-slate-300 font-semibold">
                              R$ {invoice.discount.toFixed(2)}
                            </div>
                          </div>
                          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                            <div className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">Valor Final</div>
                            <div className="text-green-800 dark:text-green-200 font-bold text-lg">
                              R$ {invoice.finalValue.toFixed(2)}
                            </div>
                          </div>
                        </div>

                        {/* Data de pagamento se pago */}
                        {invoice.paymentDate && (
                          <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded-lg mb-3">
                            <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                              Pago em: {formatDate(invoice.paymentDate)}
                            </div>
                          </div>
                        )}

                        {/* Ações */}
                        <div className="flex gap-2">
                          {invoice.status === 'paid' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkAsUnpaid(invoice)}
                              className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                            >
                              <Circle className="h-4 w-4 mr-2" />
                              Marcar como Pendente
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkAsPaid(invoice)}
                              className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                            >
                              <Check className="h-4 w-4 mr-2" />
                              Marcar como Pago
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteInvoice(invoice)}
                            className="bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <div className="text-slate-500 dark:text-slate-400">
                  <p className="text-lg font-medium">Nenhuma fatura encontrada</p>
                  <p className="text-sm mt-1">As faturas serão geradas automaticamente 7 dias antes do vencimento</p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal for Generate Invoice */}
      <Dialog open={confirmGenerateOpen} onOpenChange={setConfirmGenerateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gerar Fatura</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Deseja gerar uma fatura para <span className="font-semibold text-foreground">{nextPeriodToGenerate}</span>?
            </p>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmGenerateOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmGenerateInvoice}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Gerar Fatura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal for Delete Invoice */}
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir Fatura</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Deseja excluir a fatura de{" "}
              <span className="font-semibold text-foreground">
                {selectedInvoice ? format(parseISO(selectedInvoice.dueDate), 'MMMM yyyy', { locale: ptBR }) : ''}
              </span>?
            </p>
            <p className="text-xs text-red-600 mt-2">
              Esta ação não pode ser desfeita.
            </p>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setConfirmDeleteOpen(false);
                setSelectedInvoice(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmDeleteInvoice}
              variant="destructive"
            >
              Excluir Fatura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sigma Template Modal */}
      <Dialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Cliente Renovado no Sigma IPTV
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                ✅ Renovação realizada com sucesso!
              </p>
              <p className="text-xs text-green-600 dark:text-green-300 mt-1">
                Cliente renovado e ativado no Sigma IPTV automaticamente.
              </p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                📱 Mensagem para enviar ao cliente:
              </p>
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border relative">
                <pre className="text-sm whitespace-pre-wrap text-slate-700 dark:text-slate-300 pr-8">
                  {sigmaTemplate}
                </pre>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2 h-8 w-8 p-0"
                  onClick={() => {
                    navigator.clipboard.writeText(sigmaTemplate);
                    console.log('✅ Template copiado para a área de transferência');
                  }}
                  title="Copiar mensagem"
                >
                  📋
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(sigmaTemplate);
                // You could add a toast notification here
                console.log('✅ Template copiado para a área de transferência');
              }}
            >
              📋 Copiar
            </Button>
            <Button
              onClick={() => setShowTemplateModal(false)}
              className="bg-green-600 hover:bg-green-700"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}