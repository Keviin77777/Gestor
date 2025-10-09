import { useState, useEffect } from 'react';
import { mysqlApi } from '@/lib/mysql-api-client';

export interface ReportParams {
  start_date?: string;
  end_date?: string;
}

export function useReports(reportType: string, params: ReportParams = {}) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchReport = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const queryParams = new URLSearchParams();
      if (params.start_date) queryParams.append('start_date', params.start_date);
      if (params.end_date) queryParams.append('end_date', params.end_date);
      
      const response = await mysqlApi.get(
        `/reports/${reportType}?${queryParams.toString()}`
      );
      
      if (response.success) {
        setData(response.data);
      } else {
        throw new Error(response.error || response.message || 'Failed to fetch report');
      }
    } catch (err) {
      console.error(`Error fetching ${reportType} report:`, err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType, params.start_date, params.end_date]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchReport
  };
}

