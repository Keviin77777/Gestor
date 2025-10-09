"use client";

import { useEffect, useCallback, useState } from 'react';
import { useClients } from './use-clients';
import { useInvoices } from './use-invoices';
import { useAutoWhatsApp } from './use-auto-whatsapp';
import { differenceInDays, parseISO, format } from 'date-fns';
import type { Client, Invoice } from '@/lib/definitions';

interface AutoInvoiceOptions {
    enabled?: boolean;
    daysBeforeExpiry?: number;
    onInvoiceGenerated?: (client: Client, invoice: Partial<Invoice>) => void;
    onError?: (error: string, client: Client) => void;
}

export function useAutoInvoiceGeneration(options: AutoInvoiceOptions = {}) {
    const {
        enabled = true,
        daysBeforeExpiry = 10,
        onInvoiceGenerated,
        onError
    } = options;



    const { data: clients, refetch: refetchClients } = useClients();
    const { data: invoicesData, createInvoice, refresh: refreshInvoices } = useInvoices();
    const invoices = Array.isArray(invoicesData) ? invoicesData : [];



    // Controle para evitar execução múltipla
    const [isProcessing, setIsProcessing] = useState(false);
    const [lastProcessTime, setLastProcessTime] = useState<number>(0);
    const { sendBillingMessage } = useAutoWhatsApp({
        showNotifications: false, // Não mostrar notificações para geração automática
        onSuccess: () => { },
        onError: () => { }
    });

    const generateInvoiceForClient = useCallback(async (client: Client) => {
        try {
            // Buscar faturas existentes do cliente
            const clientInvoices = invoices?.filter(invoice => invoice.client_id === client.id) || [];

            // Usar a data de renovação atual do cliente como data de vencimento
            const dueDate = client.renewal_date;
            const dueDateObj = parseISO(dueDate);
            const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
            const monthYear = `${monthNames[dueDateObj.getMonth()]} ${dueDateObj.getFullYear()}`;

            // Verificar se já existe fatura para esta data de vencimento
            const existingInvoice = clientInvoices.find(invoice =>
                invoice.due_date === dueDate
            );

            if (existingInvoice) {
                return { success: false, reason: 'already_exists' };
            }

            // Criar nova fatura
            const newInvoice: Partial<Invoice> = {
                id: `inv_auto_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
                client_id: client.id,
                reseller_id: client.reseller_id,
                due_date: dueDate,
                issue_date: format(new Date(), 'yyyy-MM-dd'),
                value: client.value,
                discount: (client as any).discount_value || 0,
                final_value: client.value - ((client as any).discount_value || 0),
                status: 'pending',
                description: `Mensalidade - ${monthYear} (Gerada automaticamente)`
            };

            // Criar fatura no banco
            await createInvoice(newInvoice);

            // Callback de sucesso
            onInvoiceGenerated?.(client, newInvoice);

            // Enviar via WhatsApp automaticamente
            if (client.phone && client.phone.trim()) {
                await sendBillingMessage(
                    client,
                    newInvoice.final_value || 0,
                    dueDate,
                    `Mensalidade - ${monthYear} (Gerada automaticamente)`
                );
            }

            return { success: true, invoice: newInvoice };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            onError?.(errorMessage, client);
            return { success: false, error: errorMessage };
        }
    }, [invoices, createInvoice, onInvoiceGenerated, onError, sendBillingMessage]);

    const checkAndGenerateInvoices = useCallback(async () => {
        if (!enabled || !clients || clients.length === 0 || !invoices || isProcessing) {
            return;
        }

        // Evitar execução muito frequente (mínimo 5 minutos entre execuções)
        const now = Date.now();
        if (now - lastProcessTime < 5 * 60 * 1000) {
            return;
        }

        setIsProcessing(true);
        setLastProcessTime(now);

        const today = new Date();
        const clientsNeedingInvoices: Client[] = [];

        for (const client of clients) {
            if (client.status !== 'active') {
                continue; // Pular clientes inativos
            }

            const renewalDate = parseISO(client.renewal_date);
            const daysUntilRenewal = differenceInDays(renewalDate, today);

            // Verificar se está dentro do prazo para gerar fatura
            if (daysUntilRenewal <= daysBeforeExpiry && daysUntilRenewal >= 0) {
                // Verificar se já tem fatura para a data de renovação atual
                const clientInvoices = invoices.filter(invoice => invoice.client_id === client.id);
                const invoiceForRenewalDate = clientInvoices.find(invoice =>
                    invoice.due_date === client.renewal_date
                );

                // Se não tem fatura para a data de renovação, adicionar à lista
                if (!invoiceForRenewalDate) {
                    clientsNeedingInvoices.push(client);
                }
            }
        }

        // Gerar faturas para os clientes que precisam
        let generatedCount = 0;
        for (const client of clientsNeedingInvoices) {
            const result = await generateInvoiceForClient(client);
            if (result.success) {
                generatedCount++;
            }
            // Pequeno delay entre gerações para não sobrecarregar
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        if (generatedCount > 0) {
            // Atualizar dados após gerar faturas
            setTimeout(() => {
                refreshInvoices();
                refetchClients();
            }, 1000);
        }

        setIsProcessing(false);
    }, [enabled, clients, invoices, daysBeforeExpiry, generateInvoiceForClient, refreshInvoices, refetchClients]);

    // Executar verificação periodicamente
    useEffect(() => {
        console.log('⏰ useEffect executado - configurando timers automáticos', { enabled });

        if (!enabled) {
            console.log('⏭️ Geração automática desabilitada, não configurando timers');
            return;
        }

        // Executar após 10 segundos (dar tempo para carregar dados)
        const initialTimeout = setTimeout(() => {
            checkAndGenerateInvoices();
        }, 10000);

        // Executar a cada 1 hora
        const interval = setInterval(checkAndGenerateInvoices, 60 * 60 * 1000);

        return () => {
            clearTimeout(initialTimeout);
            clearInterval(interval);
        };
    }, [enabled, checkAndGenerateInvoices]); // Incluir checkAndGenerateInvoices nas dependências



    return {
        generateInvoiceForClient,
        checkAndGenerateInvoices,
        isProcessing,
    };
}