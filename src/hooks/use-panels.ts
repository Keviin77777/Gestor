import { useState, useEffect } from 'react';
import { mysqlApi, Panel } from '@/lib/mysql-api-client';
import { useMySQL } from '@/lib/mysql-provider';

export function usePanels() {
  const [data, setData] = useState<Panel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useMySQL();

  useEffect(() => {
    const fetchPanels = async () => {
      // Don't fetch if user is not authenticated
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const panels = await mysqlApi.getPanels();
        setData(panels);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch panels'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchPanels();
  }, [user]);

  const refetch = async () => {
    try {
      const panels = await mysqlApi.getPanels();
      setData(panels);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch panels'));
    }
  };

  return { data, isLoading, error, refetch };
}
