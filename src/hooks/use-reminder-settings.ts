import { useState, useEffect, useCallback } from 'react';
import { mysqlApi } from '@/lib/mysql-api-client';

export interface ReminderSettings {
  reseller_id: string;
  is_enabled: boolean;
  start_hour: number;
  end_hour: number;
  working_days: string;
  working_days_array: number[];
  check_interval_minutes: number;
  max_daily_reminders: number;
  timezone: string;
  created_at: string;
  updated_at: string;
}

interface UseReminderSettingsOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useReminderSettings(options: UseReminderSettingsOptions = {}) {
  const { autoRefresh = false, refreshInterval = 60000 } = options;
  
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await mysqlApi.getReminderSettings();
      setSettings(response);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch settings');
      setError(error);
      console.error('Error fetching reminder settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch settings on mount and when refresh is triggered
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings, refreshTrigger]);

  // Auto refresh if enabled
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchSettings();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchSettings]);

  const refresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const updateSettings = useCallback(async (settingsData: Partial<Omit<ReminderSettings, 'reseller_id' | 'created_at' | 'updated_at' | 'working_days_array'>>) => {
    try {
      setIsSaving(true);
      setError(null);
      
      const updatedSettings = await mysqlApi.updateReminderSettings(settingsData);

      setSettings(updatedSettings);
      
      return { success: true, settings: updatedSettings };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update settings');
      setError(error);
      console.error('Error updating settings:', error);
      return { success: false, error: error.message };
    } finally {
      setIsSaving(false);
    }
  }, []);

  const resetToDefaults = useCallback(async () => {
    try {
      setIsSaving(true);
      setError(null);
      
      const defaultSettings = await mysqlApi.resetReminderSettings();

      setSettings(defaultSettings);
      
      return { success: true, settings: defaultSettings };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to reset settings');
      setError(error);
      console.error('Error resetting settings:', error);
      return { success: false, error: error.message };
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Convenience methods for common operations
  const toggleEnabled = useCallback(async (enabled: boolean) => {
    return updateSettings({ is_enabled: enabled });
  }, [updateSettings]);

  const updateWorkingHours = useCallback(async (startHour: number, endHour: number) => {
    return updateSettings({ start_hour: startHour, end_hour: endHour });
  }, [updateSettings]);

  const updateWorkingDays = useCallback(async (days: number[]) => {
    const workingDays = days.sort().join(',');
    return updateSettings({ working_days: workingDays });
  }, [updateSettings]);

  const updateCheckInterval = useCallback(async (minutes: number) => {
    return updateSettings({ check_interval_minutes: minutes });
  }, [updateSettings]);

  const updateMaxDailyReminders = useCallback(async (max: number) => {
    return updateSettings({ max_daily_reminders: max });
  }, [updateSettings]);

  const updateTimezone = useCallback(async (timezone: string) => {
    return updateSettings({ timezone });
  }, [updateSettings]);

  // Validation functions
  const validateSettings = useCallback((settingsData: Partial<ReminderSettings>) => {
    const errors: string[] = [];

    if (settingsData.start_hour !== undefined) {
      if (settingsData.start_hour < 0 || settingsData.start_hour > 23) {
        errors.push('Hora de início deve estar entre 0 e 23');
      }
    }

    if (settingsData.end_hour !== undefined) {
      if (settingsData.end_hour < 0 || settingsData.end_hour > 23) {
        errors.push('Hora de fim deve estar entre 0 e 23');
      }
    }

    if (settingsData.start_hour !== undefined && settingsData.end_hour !== undefined) {
      if (settingsData.start_hour >= settingsData.end_hour && !(settingsData.start_hour === 0 && settingsData.end_hour === 0)) {
        errors.push('Hora de início deve ser menor que hora de fim (exceto para operação 24h: 0-0)');
      }
    }

    if (settingsData.check_interval_minutes !== undefined) {
      if (settingsData.check_interval_minutes < 5 || settingsData.check_interval_minutes > 1440) {
        errors.push('Intervalo de verificação deve estar entre 5 e 1440 minutos');
      }
    }

    if (settingsData.max_daily_reminders !== undefined) {
      if (settingsData.max_daily_reminders < 1 || settingsData.max_daily_reminders > 1000) {
        errors.push('Máximo de lembretes diários deve estar entre 1 e 1000');
      }
    }

    if (settingsData.working_days !== undefined) {
      const days = settingsData.working_days.split(',').map(d => parseInt(d.trim()));
      const invalidDays = days.filter(d => d < 1 || d > 7);
      
      if (invalidDays.length > 0) {
        errors.push('Dias da semana devem estar entre 1 (Segunda) e 7 (Domingo)');
      }
      
      if (days.length === 0) {
        errors.push('Pelo menos um dia da semana deve ser selecionado');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }, []);

  // Utility functions
  const isWithinWorkingHours = useCallback((hour: number) => {
    if (!settings) return false;
    
    // 24h operation
    if (settings.start_hour === 0 && settings.end_hour === 0) {
      return true;
    }
    
    return hour >= settings.start_hour && hour < settings.end_hour;
  }, [settings]);

  const isWorkingDay = useCallback((dayOfWeek: number) => {
    if (!settings) return false;
    
    return settings.working_days_array.includes(dayOfWeek);
  }, [settings]);

  const canSendReminder = useCallback((date: Date = new Date()) => {
    if (!settings || !settings.is_enabled) return false;
    
    const hour = date.getHours();
    const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay(); // Convert Sunday from 0 to 7
    
    return isWithinWorkingHours(hour) && isWorkingDay(dayOfWeek);
  }, [settings, isWithinWorkingHours, isWorkingDay]);

  const getNextValidTime = useCallback(() => {
    if (!settings) return null;
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay() === 0 ? 7 : now.getDay();
    
    // If currently within working hours and working day, return now
    if (canSendReminder(now)) {
      return now;
    }
    
    // Find next valid time
    const nextDate = new Date(now);
    
    // If today is a working day but outside hours
    if (isWorkingDay(currentDay)) {
      if (currentHour < settings.start_hour) {
        // Before working hours today
        nextDate.setHours(settings.start_hour, 0, 0, 0);
        return nextDate;
      }
    }
    
    // Find next working day
    for (let i = 1; i <= 7; i++) {
      const testDate = new Date(now);
      testDate.setDate(testDate.getDate() + i);
      const testDay = testDate.getDay() === 0 ? 7 : testDate.getDay();
      
      if (isWorkingDay(testDay)) {
        testDate.setHours(settings.start_hour, 0, 0, 0);
        return testDate;
      }
    }
    
    return null;
  }, [settings, canSendReminder, isWorkingDay]);

  // Format helpers
  const formatWorkingHours = useCallback(() => {
    if (!settings) return '';
    
    if (settings.start_hour === 0 && settings.end_hour === 0) {
      return '24 horas';
    }
    
    const formatHour = (hour: number) => hour.toString().padStart(2, '0') + ':00';
    return `${formatHour(settings.start_hour)} às ${formatHour(settings.end_hour)}`;
  }, [settings]);

  const formatWorkingDays = useCallback(() => {
    if (!settings) return '';
    
    const dayNames = ['', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    return settings.working_days_array.map(day => dayNames[day]).join(', ');
  }, [settings]);

  const formatCheckInterval = useCallback(() => {
    if (!settings) return '';
    
    const minutes = settings.check_interval_minutes;
    
    if (minutes < 60) {
      return `${minutes} minutos`;
    } else if (minutes === 60) {
      return '1 hora';
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      
      if (remainingMinutes === 0) {
        return `${hours} horas`;
      } else {
        return `${hours}h ${remainingMinutes}min`;
      }
    }
  }, [settings]);

  // Available options for dropdowns
  const timezoneOptions = [
    { value: 'America/Sao_Paulo', label: 'São Paulo (UTC-3)' },
    { value: 'America/Manaus', label: 'Manaus (UTC-4)' },
    { value: 'America/Fortaleza', label: 'Fortaleza (UTC-3)' },
    { value: 'America/Recife', label: 'Recife (UTC-3)' },
    { value: 'America/Bahia', label: 'Salvador (UTC-3)' },
    { value: 'UTC', label: 'UTC (UTC+0)' },
  ];

  const intervalOptions = [
    { value: 5, label: '5 minutos' },
    { value: 15, label: '15 minutos' },
    { value: 30, label: '30 minutos' },
    { value: 60, label: '1 hora' },
    { value: 120, label: '2 horas' },
    { value: 180, label: '3 horas' },
    { value: 360, label: '6 horas' },
    { value: 720, label: '12 horas' },
    { value: 1440, label: '24 horas' },
  ];

  return {
    // Data
    settings,
    isLoading,
    error,
    isSaving,
    
    // Actions
    refresh,
    updateSettings,
    resetToDefaults,
    
    // Convenience methods
    toggleEnabled,
    updateWorkingHours,
    updateWorkingDays,
    updateCheckInterval,
    updateMaxDailyReminders,
    updateTimezone,
    
    // Validation
    validateSettings,
    
    // Utilities
    isWithinWorkingHours,
    isWorkingDay,
    canSendReminder,
    getNextValidTime,
    
    // Formatters
    formatWorkingHours,
    formatWorkingDays,
    formatCheckInterval,
    
    // Options
    timezoneOptions,
    intervalOptions,
  };
}