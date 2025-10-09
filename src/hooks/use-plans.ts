import { useState, useEffect } from 'react';
import { mysqlApi, Plan } from '@/lib/mysql-api-client';
import { useMySQL } from '@/lib/mysql-provider';

export function usePlans() {
  const [data, setData] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useMySQL();

  useEffect(() => {
    const fetchPlans = async () => {
      // Don't fetch if user is not authenticated
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const plans = await mysqlApi.getPlans();
        setData(plans);
        setError(null);
      } catch (err) {
        console.error('Error fetching plans:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch plans'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlans();
  }, [user]);

  const refetch = async () => {
    try {
      const plans = await mysqlApi.getPlans();
      setData(plans);
      setError(null);
    } catch (err) {
      console.error('Error refetching plans:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch plans'));
    }
  };

  return { data, isLoading, error, refetch };
}
