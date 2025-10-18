import { useState, useEffect } from 'react';
import type { App } from '@/lib/definitions';

export function useApps() {
  const [data, setData] = useState<App[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchApps = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/apps', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar aplicativos');
      }

      const result = await response.json();
      setData(result.apps || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Erro desconhecido'));
      console.error('Erro ao buscar aplicativos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const createApp = async (appData: { name: string; description?: string }) => {
    try {
      const response = await fetch('/api/apps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(appData),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Erro ao criar aplicativo');
      }

      await fetchApps(); // Refresh the list
      return await response.json();
    } catch (err) {
      throw err;
    }
  };

  const updateApp = async (id: string, appData: { name: string; description?: string }) => {
    try {
      const response = await fetch(`/api/apps/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(appData),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Erro ao atualizar aplicativo');
      }

      await fetchApps(); // Refresh the list
      return await response.json();
    } catch (err) {
      throw err;
    }
  };

  const deleteApp = async (id: string) => {
    try {
      const response = await fetch(`/api/apps/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Erro ao excluir aplicativo');
      }

      await fetchApps(); // Refresh the list
      return await response.json();
    } catch (err) {
      throw err;
    }
  };

  const refetch = fetchApps;

  useEffect(() => {
    fetchApps();
  }, []);

  return {
    data,
    isLoading,
    error,
    refetch,
    createApp,
    updateApp,
    deleteApp,
  };
}