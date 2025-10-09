import { useState, useEffect, useCallback } from 'react';
import { mysqlApi } from '@/lib/mysql-api-client';

export interface ReminderLog {
  id: string;
  reseller_id: string;
  client_id: string;
  template_id: string;
  message_content: string;
  scheduled_date: string;
  sent_at?: string;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  error_message?: string;
  retry_count: number;
  whatsapp_message_id?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  client_name?: string;
  client_phone?: string;
  template_name?: string;
  reminder_type?: 'before' | 'on_due' | 'after';
  days_offset?: number;
}

export interface ReminderStats {
  today_total: number;
  today_success: number;
  today_failed: number;
  pending: number;
  month: {
    total: number;
    sent: number;
    failed: number;
    cancelled: number;
  };
  success_rate: number;
  top_templates: Array<{
    name: string;
    reminder_type: string;
    days_offset: number;
    usage_count: number;
  }>;
}

interface PaginationInfo {
  current_page: number;
  total_pages: number;
  total_count: number;
  per_page: number;
  has_next: boolean;
  has_prev: boolean;
}

interface ReminderHistoryResponse {
  logs: ReminderLog[];
  pagination: PaginationInfo;
}

interface UseReminderHistoryOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  initialFilters?: ReminderHistoryFilters;
}

export interface ReminderHistoryFilters {
  client_id?: string;
  template_id?: string;
  status?: ReminderLog['status'];
  reminder_type?: 'before' | 'on_due' | 'after';
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

export function useReminderHistory(options: UseReminderHistoryOptions = {}) {
  const { autoRefresh = false, refreshInterval = 30000, initialFilters = {} } = options;
  
  const [logs, setLogs] = useState<ReminderLog[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [stats, setStats] = useState<ReminderStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState<ReminderHistoryFilters>(initialFilters);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchLogs = useCallback(async (currentFilters: ReminderHistoryFilters = filters) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Build query parameters
      const params = new URLSearchParams();
      
      Object.entries(currentFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
      
      const queryString = params.toString();
      const url = `/whatsapp-reminder-logs${queryString ? `?${queryString}` : ''}`;
      
      const response = await mysqlApi.getReminderLogs(currentFilters);
      
      setLogs(response.logs);
      setPagination(response.pagination);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch reminder history');
      setError(error);
      console.error('Error fetching reminder history:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const fetchStats = useCallback(async () => {
    try {
      setIsLoadingStats(true);
      
      const response = await mysqlApi.getReminderStats();
      setStats(response);
    } catch (err) {
      console.error('Error fetching reminder stats:', err);
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  // Fetch data on mount and when filters or refresh is triggered
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs, refreshTrigger]);

  // Fetch stats on mount and refresh
  useEffect(() => {
    fetchStats();
  }, [fetchStats, refreshTrigger]);

  // Auto refresh if enabled
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchLogs();
      fetchStats();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchLogs, fetchStats]);

  const refresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const updateFilters = useCallback((newFilters: Partial<ReminderHistoryFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    
    // Reset page when changing filters (except when explicitly setting page)
    if (!newFilters.hasOwnProperty('page')) {
      updatedFilters.page = 1;
    }
    
    setFilters(updatedFilters);
  }, [filters]);

  const clearFilters = useCallback(() => {
    setFilters({ page: 1, limit: filters.limit || 20 });
  }, [filters.limit]);

  const goToPage = useCallback((page: number) => {
    updateFilters({ page });
  }, [updateFilters]);

  const changePageSize = useCallback((limit: number) => {
    updateFilters({ limit, page: 1 });
  }, [updateFilters]);

  // Actions on logs
  const retryLog = useCallback(async (logId: string) => {
    try {
      const updatedLog = await mysqlApi.retryReminderLog(logId);

      // Update local state
      setLogs(prev => 
        prev.map(log => 
          log.id === logId ? updatedLog : log
        )
      );
      
      // Refresh stats
      fetchStats();
      
      return { success: true, log: updatedLog };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to retry reminder');
      console.error('Error retrying reminder:', error);
      return { success: false, error: error.message };
    }
  }, [fetchStats]);

  const updateLogStatus = useCallback(async (logId: string, status: ReminderLog['status'], errorMessage?: string) => {
    try {
      const updateData: any = { status };
      
      if (errorMessage) {
        updateData.error_message = errorMessage;
      }
      
      if (status === 'sent') {
        updateData.sent_at = new Date().toISOString();
      }
      
      const updatedLog = await mysqlApi.updateReminderLog(logId, updateData);

      // Update local state
      setLogs(prev => 
        prev.map(log => 
          log.id === logId ? updatedLog : log
        )
      );
      
      // Refresh stats
      fetchStats();
      
      return { success: true, log: updatedLog };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update log status');
      console.error('Error updating log status:', error);
      return { success: false, error: error.message };
    }
  }, [fetchStats]);

  const cleanupOldLogs = useCallback(async (days: number = 90) => {
    try {
      const response = await mysqlApi.cleanupReminderLogs(days);
      
      // Refresh data after cleanup
      refresh();
      
      return { success: true, ...response };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to cleanup logs');
      console.error('Error cleaning up logs:', error);
      return { success: false, error: error.message };
    }
  }, [refresh]);

  // Utility functions
  const getLogById = useCallback((id: string) => {
    return logs.find(log => log.id === id);
  }, [logs]);

  const getLogsByStatus = useCallback((status: ReminderLog['status']) => {
    return logs.filter(log => log.status === status);
  }, [logs]);

  const getLogsByClient = useCallback((clientId: string) => {
    return logs.filter(log => log.client_id === clientId);
  }, [logs]);

  const getLogsByTemplate = useCallback((templateId: string) => {
    return logs.filter(log => log.template_id === templateId);
  }, [logs]);

  // Status helpers
  const getStatusColor = useCallback((status: ReminderLog['status']) => {
    switch (status) {
      case 'sent':
        return 'green';
      case 'pending':
        return 'yellow';
      case 'failed':
        return 'red';
      case 'cancelled':
        return 'gray';
      default:
        return 'gray';
    }
  }, []);

  const getStatusLabel = useCallback((status: ReminderLog['status']) => {
    switch (status) {
      case 'sent':
        return 'Enviado';
      case 'pending':
        return 'Pendente';
      case 'failed':
        return 'Falhou';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  }, []);

  const getReminderTypeLabel = useCallback((type?: string) => {
    switch (type) {
      case 'before':
        return 'Antes do vencimento';
      case 'on_due':
        return 'No vencimento';
      case 'after':
        return 'Após vencimento';
      default:
        return type || 'N/A';
    }
  }, []);

  // Export functions
  const exportToCSV = useCallback(() => {
    const headers = [
      'Data/Hora',
      'Cliente',
      'Template',
      'Tipo',
      'Status',
      'Tentativas',
      'Erro'
    ];
    
    const rows = logs.map(log => [
      new Date(log.created_at).toLocaleString('pt-BR'),
      log.client_name || 'N/A',
      log.template_name || 'N/A',
      getReminderTypeLabel(log.reminder_type),
      getStatusLabel(log.status),
      log.retry_count.toString(),
      log.error_message || ''
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `lembretes_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [logs, getReminderTypeLabel, getStatusLabel]);

  // Filter options for UI
  const statusOptions = [
    { value: '', label: 'Todos os status' },
    { value: 'pending', label: 'Pendente' },
    { value: 'sent', label: 'Enviado' },
    { value: 'failed', label: 'Falhou' },
    { value: 'cancelled', label: 'Cancelado' },
  ];

  const reminderTypeOptions = [
    { value: '', label: 'Todos os tipos' },
    { value: 'before', label: 'Antes do vencimento' },
    { value: 'on_due', label: 'No vencimento' },
    { value: 'after', label: 'Após vencimento' },
  ];

  return {
    // Data
    logs,
    pagination,
    stats,
    isLoading,
    isLoadingStats,
    error,
    filters,
    
    // Actions
    refresh,
    updateFilters,
    clearFilters,
    goToPage,
    changePageSize,
    retryLog,
    updateLogStatus,
    cleanupOldLogs,
    
    // Utilities
    getLogById,
    getLogsByStatus,
    getLogsByClient,
    getLogsByTemplate,
    getStatusColor,
    getStatusLabel,
    getReminderTypeLabel,
    
    // Export
    exportToCSV,
    
    // Options for UI
    statusOptions,
    reminderTypeOptions,
  };
}