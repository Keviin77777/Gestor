import { useState, useEffect } from 'react';
import { mysqlApi } from '@/lib/mysql-api-client';
import type { Invoice } from '@/lib/definitions';

export function useInvoices(params?: { client_id?: string; status?: string }) {
  const [data, setData] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchInvoices = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 useInvoices: Fetching invoices from API');
      const invoices = await mysqlApi.getInvoices();
      
      console.log('📦 useInvoices: Raw data from API:', invoices);
      console.log('📦 useInvoices: Is array?', Array.isArray(invoices));
      console.log('📦 useInvoices: Type:', typeof invoices);

      // Filter by client_id if provided
      let filteredInvoices = invoices;
      if (params?.client_id) {
        console.log('🔍 useInvoices: Filtering by client_id:', params.client_id);
        filteredInvoices = invoices.filter(invoice => invoice.client_id === params.client_id);
        console.log('🔍 useInvoices: Filtered invoices:', filteredInvoices);
      }

      // Filter by status if provided
      if (params?.status) {
        filteredInvoices = filteredInvoices.filter(invoice => invoice.status === params.status);
      }

      setData(filteredInvoices);
      setError(null);
      console.log('✅ useInvoices: Data updated, invoices count:', filteredInvoices?.length);
    } catch (err) {
      console.error('❌ useInvoices: Error fetching invoices:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch invoices'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [params?.client_id, params?.status, refreshTrigger]);

  const refresh = () => {
    console.log('🔄 useInvoices: Triggering refresh');
    setRefreshTrigger(prev => prev + 1);
  };

  const markAsPaid = async (id: string, paymentDate?: string) => {
    try {
      const result = await mysqlApi.markInvoiceAsPaid(id, paymentDate);

      // Force refresh
      refresh();

      return result;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to mark invoice as paid');
    }
  };

  const unmarkAsPaid = async (id: string) => {
    try {
      const result = await mysqlApi.unmarkInvoiceAsPaid(id);

      // Force refresh
      refresh();

      return result;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to unmark invoice as paid');
    }
  };

  const createInvoice = async (invoice: Partial<Invoice>) => {
    try {
      const newInvoice = await mysqlApi.createInvoice(invoice);

      // Force refresh
      refresh();

      return newInvoice;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to create invoice');
    }
  };

  const updateInvoice = async (id: string, invoice: Partial<Invoice>) => {
    try {
      await mysqlApi.updateInvoice(id, invoice);

      // Force refresh
      refresh();
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to update invoice');
    }
  };

  const deleteInvoice = async (id: string) => {
    try {
      await mysqlApi.deleteInvoice(id);

      // Force refresh
      refresh();
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to delete invoice');
    }
  };

  return {
    data,
    isLoading,
    error,
    markAsPaid,
    unmarkAsPaid,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    refresh
  };
}