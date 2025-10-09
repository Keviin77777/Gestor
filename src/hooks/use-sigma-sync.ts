import { useState } from 'react';
import { mysqlApi } from '@/lib/mysql-api-client';

export function useSigmaSync() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncClient = async (clientId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await mysqlApi.syncClientWithSigma(clientId);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao sincronizar com Sigma';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const syncMultipleClients = async (clientIds: string[]) => {
    setIsLoading(true);
    setError(null);

    const results = [];
    const errors = [];

    for (const clientId of clientIds) {
      try {
        const result = await mysqlApi.syncClientWithSigma(clientId);
        results.push({ clientId, success: true, data: result });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        errors.push({ clientId, error: errorMessage });
        results.push({ clientId, success: false, error: errorMessage });
      }
    }

    setIsLoading(false);

    if (errors.length > 0) {
      setError(`${errors.length} cliente(s) falharam na sincronização`);
    }

    return { results, errors, successCount: results.filter(r => r.success).length };
  };

  return {
    syncClient,
    syncMultipleClients,
    isLoading,
    error,
    clearError: () => setError(null)
  };
}
