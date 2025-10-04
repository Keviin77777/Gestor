import { useState, useCallback } from 'react';
import type { Panel } from '@/lib/definitions';

interface SigmaConfig {
  url: string;
  username: string;
  token: string;
  userId?: string;
}

interface SigmaClientData {
  username?: string;
  password?: string;
  name?: string;
  email?: string;
  whatsapp?: string;
  note?: string;
  packageId?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

export function useSigmaIntegration() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testConnection = useCallback(async (config: SigmaConfig) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/sigma/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const result = await response.json();
      
      if (!result.success) {
        setError(result.error);
        return { success: false, error: result.error };
      }

      return { success: true, userId: result.userId };
    } catch (err) {
      const errorMessage = 'Erro ao testar conexão';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getPackages = useCallback(async (config: SigmaConfig) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/sigma/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const result = await response.json();
      
      if (!result.success) {
        setError(result.error);
        return { success: false, error: result.error };
      }

      return { success: true, data: result.data };
    } catch (err) {
      const errorMessage = 'Erro ao buscar pacotes';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const syncClient = useCallback(async (
    panel: Panel,
    action: 'create' | 'renew' | 'status' | 'delete' | 'get',
    clientData: SigmaClientData
  ) => {
    if (!panel.sigmaConnected || !panel.sigmaUrl || !panel.sigmaUsername || !panel.sigmaToken) {
      const errorMessage = 'Painel não está conectado ao Sigma IPTV';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }

    setIsLoading(true);
    setError(null);

    try {
      const sigmaConfig = {
        url: panel.sigmaUrl,
        username: panel.sigmaUsername,
        token: panel.sigmaToken,
        userId: panel.sigmaUserId
      };

      const response = await fetch('/api/sigma/sync-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sigmaConfig,
          action,
          clientData
        }),
      });

      const result = await response.json();
      
      if (!result.success) {
        setError(result.error);
        return { success: false, error: result.error };
      }

      return { success: true, data: result.data };
    } catch (err) {
      const errorMessage = 'Erro ao sincronizar cliente';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createClient = useCallback(async (panel: Panel, clientData: SigmaClientData) => {
    return syncClient(panel, 'create', clientData);
  }, [syncClient]);

  const renewClient = useCallback(async (panel: Panel, username: string, packageId: string) => {
    return syncClient(panel, 'renew', { username, packageId });
  }, [syncClient]);

  const updateClientStatus = useCallback(async (panel: Panel, username: string, status: 'ACTIVE' | 'INACTIVE') => {
    return syncClient(panel, 'status', { username, status });
  }, [syncClient]);

  const deleteClient = useCallback(async (panel: Panel, username: string) => {
    return syncClient(panel, 'delete', { username });
  }, [syncClient]);

  const getClient = useCallback(async (panel: Panel, username: string) => {
    return syncClient(panel, 'get', { username });
  }, [syncClient]);

  // Auto-sync client status based on renewal date
  const autoSyncClientStatus = useCallback(async (panel: Panel, client: any) => {
    if (!panel.sigmaConnected || !client.username) {
      return { success: false, error: 'Cliente não configurado para Sigma' };
    }

    const today = new Date();
    const renewalDate = new Date(client.renewalDate);
    const isExpired = renewalDate < today;
    const sigmaStatus = isExpired ? 'INACTIVE' : 'ACTIVE';

    return updateClientStatus(panel, client.username, sigmaStatus);
  }, [updateClientStatus]);

  // Sync client data FROM Sigma TO local database
  const syncFromSigma = useCallback(async (client: any, panel: Panel, firestore: any, resellerId: string) => {
    if (!panel.sigmaConnected || !client.username) {
      return { success: false, error: 'Painel não está conectado ao Sigma ou cliente sem username' };
    }

    setIsLoading(true);
    setError(null);

    try {
      const sigmaConfig = {
        url: panel.sigmaUrl!,
        username: panel.sigmaUsername!,
        token: panel.sigmaToken!,
        userId: panel.sigmaUserId!
      };

      const response = await fetch('/api/sigma/sync-from-sigma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: client.username,
          currentRenewalDate: client.renewalDate,
          sigmaConfig
        }),
      });

      const result = await response.json();
      
      if (!result.success) {
        setError(result.error);
        return { success: false, error: result.error };
      }

      // If dates are different, update the local database
      if (result.updated) {
        const { updateDocumentNonBlocking } = await import('@/firebase/non-blocking-updates');
        const { doc } = await import('firebase/firestore');
        
        const clientRef = doc(firestore, 'resellers', resellerId, 'clients', client.id);
        updateDocumentNonBlocking(clientRef, {
          renewalDate: result.newDate,
          lastSigmaSync: new Date().toISOString()
        });
      }

      return { success: true, data: result };
    } catch (err) {
      const errorMessage = 'Erro ao sincronizar do Sigma';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    testConnection,
    getPackages,
    createClient,
    renewClient,
    updateClientStatus,
    deleteClient,
    getClient,
    autoSyncClientStatus,
    syncFromSigma,
    clearError: () => setError(null)
  };
}