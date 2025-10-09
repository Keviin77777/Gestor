import { useState, useEffect } from 'react';
import { mysqlApi, Client } from '@/lib/mysql-api-client';
import { useMySQL } from '@/lib/mysql-provider';

export function useClients(params?: { status?: string; search?: string }) {
  const [data, setData] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useMySQL();

  useEffect(() => {
    const fetchClients = async () => {
      // Don't fetch if user is not authenticated
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await mysqlApi.getClients(params);
        const { clients } = response;
        setData(clients);
        setError(null);
      } catch (err) {
        console.error('useClients: Error fetching clients:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch clients'));
        // Set empty array on error to prevent infinite loading
        setData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClients();
  }, [user, params?.status, params?.search]);

  const refetch = async () => {
    try {
      const { clients } = await mysqlApi.getClients(params);
      setData(clients);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch clients'));
    }
  };

  return { data, isLoading, error, refetch };
}
