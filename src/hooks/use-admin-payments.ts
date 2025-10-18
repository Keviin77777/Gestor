import { useState, useEffect, useCallback } from 'react';

interface Payment {
  id: string;
  reseller_id: string;
  reseller_name: string;
  reseller_email: string;
  plan_id: string;
  plan_name: string;
  amount: string;
  payment_method: string;
  status: 'pending' | 'paid' | 'expired' | 'failed';
  transaction_id: string;
  payment_date: string;
  expires_at: string;
  notes: string;
}

interface PaymentStats {
  total_pending_amount: number;
  total_paid_amount: number;
  pending_count: number;
  paid_count: number;
  expired_count: number;
}

interface AdminPaymentsData {
  payments: Payment[];
  stats: PaymentStats;
}

export function useAdminPayments() {
  const [data, setData] = useState<AdminPaymentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin-subscription-payments`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        throw new Error(`Erro ao buscar pagamentos: ${response.status}`);
      }

      const text = await response.text();
      
      // Se resposta vazia, usar dados padrão
      if (!text || text.trim() === '') {
        console.warn('API retornou resposta vazia');
        setData({
          payments: [],
          stats: {
            total_pending_amount: 0,
            total_paid_amount: 0,
            pending_count: 0,
            paid_count: 0,
            expired_count: 0
          }
        });
        return;
      }

      const result = JSON.parse(text);
      setData(result);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      // Definir dados vazios em caso de erro
      setData({
        payments: [],
        stats: {
          total_pending_amount: 0,
          total_paid_amount: 0,
          pending_count: 0,
          paid_count: 0,
          expired_count: 0
        }
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  return { data, loading, error, refetch: fetchPayments };
}

export function useConfirmPayment() {
  const [loading, setLoading] = useState(false);

  const confirmPayment = async (paymentId: string) => {
    try {
      setLoading(true);

      // Usar o rewrite do Next.js que redireciona /api/* para PHP
      const response = await fetch(`/api/admin-subscription-payments`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ payment_id: paymentId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao confirmar pagamento');
      }

      const result = await response.json();
      return result;
    } catch (err) {
      console.error('Erro ao confirmar pagamento:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { confirmPayment, loading };
}
