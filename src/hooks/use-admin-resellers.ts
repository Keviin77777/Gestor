import { useState, useEffect } from 'react';

export interface Reseller {
  id: string;
  email: string;
  display_name: string;
  phone: string | null;
  is_active: boolean;
  is_admin: boolean;
  subscription_expiry_date: string | null;
  subscription_plan_id: string | null;
  plan_name: string | null;
  plan_price: string | null;
  plan_duration: number | null;
  created_at: string;
  days_remaining: number | null;
  subscription_health: 'active' | 'expiring_soon' | 'expired' | 'no_subscription';
  total_clients: number;
  active_clients: number;
}

export interface CreateResellerData {
  email: string;
  password: string;
  display_name: string;
  phone?: string;
  is_active?: boolean;
  is_admin?: boolean;
  subscription_expiry_date?: string;
  subscription_plan_id?: string;
}

export interface UpdateResellerData {
  id: string;
  email?: string;
  display_name?: string;
  phone?: string;
  is_active?: boolean;
  is_admin?: boolean;
  subscription_expiry_date?: string;
  subscription_plan_id?: string;
  password?: string;
}

export function useAdminResellers() {
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_PHP_API_URL || 'http://localhost:8080';

  const fetchResellers = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin-resellers`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar revendas');
      }

      const data = await response.json();
      setResellers(data.resellers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      console.error('Erro ao buscar revendas:', err);
    } finally {
      setLoading(false);
    }
  };

  const createReseller = async (data: CreateResellerData) => {
    try {
      const response = await fetch(`/api/admin-resellers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar revenda');
      }

      await fetchResellers();
      return result;
    } catch (err) {
      throw err;
    }
  };

  const updateReseller = async (data: UpdateResellerData) => {
    try {
      const response = await fetch(`/api/admin-resellers`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao atualizar revenda');
      }

      await fetchResellers();
      return result;
    } catch (err) {
      throw err;
    }
  };

  const deleteReseller = async (id: string) => {
    try {
      const response = await fetch(`/api/admin-resellers`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ id }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao deletar revenda');
      }

      await fetchResellers();
      return result;
    } catch (err) {
      throw err;
    }
  };

  useEffect(() => {
    fetchResellers();
  }, []);

  return {
    resellers,
    loading,
    error,
    fetchResellers,
    createReseller,
    updateReseller,
    deleteReseller,
  };
}
