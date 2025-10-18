import { useState, useEffect } from 'react';

export interface SubscriptionPlan {
  id: string;
  name: string;
  duration_days: number;
  price: number;
  description: string;
}

export interface PaymentHistory {
  id: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  status: 'pending' | 'paid' | 'failed' | 'cancelled';
  transaction_id: string;
  plan_name: string;
  plan_duration: number;
}

export interface SubscriptionInfo {
  id: string;
  email: string;
  display_name: string;
  is_admin: boolean;
  subscription_expiry_date: string | null;
  subscription_id: string | null;
  subscription_status: string | null;
  subscription_start_date: string | null;
  plan_id: string | null;
  plan_name: string | null;
  plan_price: number | null;
  plan_duration: number | null;
  days_remaining: number | null;
  subscription_health: 'no_subscription' | 'expired' | 'expiring_soon' | 'active';
}

export interface SubscriptionData {
  subscription: SubscriptionInfo;
  plans: SubscriptionPlan[];
  paymentHistory: PaymentHistory[];
}

export function useResellerSubscription() {
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_PHP_API_URL || 'http://localhost:8080';

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      setError(null);

      const url = `/api/reseller-subscriptions`;
      console.log('📡 Fazendo requisição para:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Usar cookies de sessão
      });

      console.log('📥 Resposta recebida:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Status:', response.status);
        console.error('❌ Erro na resposta:', errorText);
        throw new Error(`Erro ao buscar assinatura: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Dados recebidos:', result);
      setData(result);
    } catch (err) {
      console.error('❌ Erro ao buscar assinatura:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, [apiUrl]);

  return {
    data,
    loading,
    error,
    refetch: fetchSubscription,
  };
}

export interface CreatePaymentParams {
  plan_id: string;
}

export interface PaymentResponse {
  success: boolean;
  payment_id: string;
  transaction_id: string;
  pix_code: string;
  qr_code: string;
  amount: number;
  plan_name: string;
  expires_at: string;
}

export function useCreateSubscriptionPayment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_PHP_API_URL || 'http://localhost:8080';

  const createPayment = async (params: CreatePaymentParams): Promise<PaymentResponse | null> => {
    try {
      setLoading(true);
      setError(null);

      console.log('💳 Iniciando criação de pagamento...', params);
      console.log('📡 API URL:', apiUrl);

      const url = `/api/reseller-subscription-payment`;
      console.log('📡 Fazendo requisição para:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Usar cookies de sessão
        body: JSON.stringify(params),
      });

      console.log('📥 Resposta recebida:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro na resposta:', errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || 'Erro ao criar pagamento');
        } catch (e) {
          throw new Error(`Erro ao criar pagamento: ${response.status} - ${errorText}`);
        }
      }

      const result = await response.json();
      console.log('✅ Pagamento criado com sucesso:', result);
      return result;
    } catch (err) {
      console.error('❌ Erro ao criar pagamento:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      alert(`Erro: ${errorMessage}`); // Adicionar alert temporário para debug
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    createPayment,
    loading,
    error,
  };
}
