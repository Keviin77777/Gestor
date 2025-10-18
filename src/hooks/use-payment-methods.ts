import { useState, useEffect } from 'react';

export interface PaymentMethod {
  id: string;
  method_type: 'mercadopago' | 'asaas';
  is_active: boolean;
  is_default: boolean;
  
  // Mercado Pago
  mp_public_key?: string;
  mp_access_token?: string;
  mp_public_key_masked?: string;
  mp_access_token_masked?: string;
  
  // Asaas
  asaas_api_key?: string;
  asaas_pix_key?: string;
  asaas_webhook_url?: string;
  asaas_api_key_masked?: string;
  
  created_at: string;
  updated_at: string;
}

export function usePaymentMethods() {
  const [data, setData] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchPaymentMethods = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/payment-methods', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch payment methods');
      }

      const methods = await response.json();
      setData(methods);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch payment methods'));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPaymentMethod = async (id: string): Promise<PaymentMethod> => {
    try {
      const response = await fetch(`/api/payment-methods/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch payment method');
      }

      return await response.json();
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to fetch payment method');
    }
  };

  useEffect(() => {
    fetchPaymentMethods();
  }, [refreshTrigger]);

  const refresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const createPaymentMethod = async (method: Partial<PaymentMethod>) => {
    try {
      const response = await fetch('/api/payment-methods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(method),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create payment method');
      }

      const result = await response.json();
      refresh();
      return result;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to create payment method');
    }
  };

  const updatePaymentMethod = async (id: string, method: Partial<PaymentMethod>) => {
    try {
      const response = await fetch(`/api/payment-methods/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(method),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update payment method');
      }

      refresh();
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to update payment method');
    }
  };

  const deletePaymentMethod = async (id: string) => {
    try {
      const response = await fetch(`/api/payment-methods/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete payment method');
      }

      refresh();
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to delete payment method');
    }
  };

  const generatePaymentLink = async (invoiceId: string, paymentMethodId?: string) => {
    try {
      const response = await fetch('/api/payment-checkout/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          invoice_id: invoiceId,
          payment_method_id: paymentMethodId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate payment link');
      }

      return await response.json();
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to generate payment link');
    }
  };

  return {
    data,
    isLoading,
    error,
    fetchPaymentMethod,
    createPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
    generatePaymentLink,
    refresh,
  };
}
