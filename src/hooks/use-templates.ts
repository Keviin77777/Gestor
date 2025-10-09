import { useState, useEffect, useCallback } from 'react';

export interface WhatsAppTemplate {
  id: string;
  reseller_id: string;
  name: string;
  type: 'welcome' | 'invoice' | 'renewal' | 'reminder_before' | 'reminder_due' | 'reminder_after' | 'data_send' | 'payment_link' | 'custom';
  trigger_event: 'user_created' | 'invoice_generated' | 'invoice_paid' | 'scheduled' | 'manual';
  message: string;
  has_media: boolean;
  media_url: string | null;
  media_type: 'image' | 'video' | 'document' | 'audio' | null;
  is_default: boolean;
  is_active: boolean;
  days_offset: number | null;
  send_hour: number | null;
  send_minute: number;
  use_global_schedule: boolean;
  created_at: string;
  updated_at: string;
}

interface UseTemplatesOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useTemplates(options: UseTemplatesOptions = {}) {
  const { autoRefresh = false, refreshInterval = 30000 } = options;

  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchTemplates = useCallback(async (filters?: {
    type?: string;
    trigger?: string;
    active?: boolean;
    default?: boolean;
    search?: string;
  }) => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters?.type) params.append('type', filters.type);
      if (filters?.trigger) params.append('trigger', filters.trigger);
      if (filters?.active !== undefined) params.append('active', filters.active.toString());
      if (filters?.default !== undefined) params.append('default', filters.default.toString());
      if (filters?.search) params.append('search', filters.search);

      const queryString = params.toString();
      const url = `/api/whatsapp/reminder-templates${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }

      const data = await response.json();
      setTemplates(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch templates');
      setError(error);
      console.error('Error fetching templates:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates, refreshTrigger]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchTemplates();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchTemplates]);

  const refresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const createTemplate = useCallback(async (templateData: Omit<WhatsAppTemplate, 'id' | 'reseller_id' | 'created_at' | 'updated_at'>) => {
    try {
      console.log('Creating template:', templateData);
      
      const response = await fetch('/api/whatsapp/reminder-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(templateData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Create error:', response.status, errorData);
        throw new Error(errorData.error || errorData.details || errorData.message || 'Failed to create template');
      }

      const newTemplate = await response.json();
      console.log('Template created successfully:', newTemplate);
      
      setTemplates(prev => [newTemplate, ...prev]);

      return { success: true, template: newTemplate };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create template');
      console.error('Error creating template:', error);
      return { success: false, error: error.message };
    }
  }, []);

  const updateTemplate = useCallback(async (id: string, templateData: Partial<Omit<WhatsAppTemplate, 'id' | 'reseller_id' | 'created_at' | 'updated_at'>>) => {
    try {
      console.log('Updating template:', id, templateData);
      
      const response = await fetch(`/api/whatsapp/reminder-templates/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(templateData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Update error:', response.status, errorData);
        throw new Error(errorData.error || errorData.details || errorData.message || 'Failed to update template');
      }

      const updatedTemplate = await response.json();
      console.log('Template updated successfully:', updatedTemplate);
      
      setTemplates(prev =>
        prev.map(template =>
          template.id === id ? updatedTemplate : template
        )
      );

      return { success: true, template: updatedTemplate };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update template');
      console.error('Error updating template:', error);
      return { success: false, error: error.message };
    }
  }, []);

  const deleteTemplate = useCallback(async (id: string) => {
    try {
      console.log('Deleting template:', id);
      
      const response = await fetch(`/api/whatsapp/reminder-templates/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Delete error:', response.status, errorData);
        throw new Error(errorData.error || errorData.details || errorData.message || 'Failed to delete template');
      }

      console.log('Template deleted successfully');
      setTemplates(prev => prev.filter(template => template.id !== id));

      return { success: true };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete template');
      console.error('Error deleting template:', error);
      return { success: false, error: error.message };
    }
  }, []);

  const toggleTemplate = useCallback(async (id: string, isActive: boolean) => {
    return updateTemplate(id, { is_active: isActive });
  }, [updateTemplate]);

  const duplicateTemplate = useCallback(async (id: string, newName?: string) => {
    const template = templates.find(t => t.id === id);
    if (!template) {
      return { success: false, error: 'Template not found' };
    }

    const duplicatedData = {
      name: newName || `${template.name} (Cópia)`,
      message: template.message,
      type: template.type,
      trigger_event: template.trigger_event,
      has_media: template.has_media,
      media_url: template.media_url,
      media_type: template.media_type,
      is_default: false,
      is_active: false,
      days_offset: template.days_offset,
      send_hour: template.send_hour,
      send_minute: template.send_minute,
      use_global_schedule: template.use_global_schedule,
    };

    return createTemplate(duplicatedData);
  }, [templates, createTemplate]);

  const getPreview = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/whatsapp/reminder-templates/${id}?action=preview`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Preview error:', response.status, errorData);
        throw new Error(errorData.error || errorData.details || 'Failed to get preview');
      }

      const data = await response.json();
      
      // Check if response has the expected structure
      if (!data.preview) {
        console.error('Invalid preview response:', data);
        throw new Error('Invalid preview response format');
      }
      
      return { success: true, preview: data.preview, sampleData: data.sample_data };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to get preview');
      console.error('Error getting preview:', error);
      return { success: false, error: error.message };
    }
  }, []);

  // Utility functions
  const getTemplatesByType = useCallback((type: WhatsAppTemplate['type']) => {
    return templates.filter(template => template.type === type);
  }, [templates]);

  const getActiveTemplates = useCallback(() => {
    return templates.filter(template => template.is_active);
  }, [templates]);

  const getDefaultTemplates = useCallback(() => {
    return templates.filter(template => template.is_default);
  }, [templates]);

  const getTemplateById = useCallback((id: string) => {
    return templates.find(template => template.id === id);
  }, [templates]);

  // Statistics
  const stats = {
    total: templates.length,
    active: templates.filter(t => t.is_active).length,
    inactive: templates.filter(t => !t.is_active).length,
    default: templates.filter(t => t.is_default).length,
    custom: templates.filter(t => !t.is_default).length,
    withMedia: templates.filter(t => t.has_media).length,
    byType: {
      welcome: templates.filter(t => t.type === 'welcome').length,
      invoice: templates.filter(t => t.type === 'invoice').length,
      renewal: templates.filter(t => t.type === 'renewal').length,
      reminder_before: templates.filter(t => t.type === 'reminder_before').length,
      reminder_due: templates.filter(t => t.type === 'reminder_due').length,
      reminder_after: templates.filter(t => t.type === 'reminder_after').length,
      custom: templates.filter(t => t.type === 'custom').length,
    }
  };

  return {
    // Data
    templates,
    isLoading,
    error,
    stats,

    // Actions
    refresh,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    toggleTemplate,
    duplicateTemplate,
    getPreview,

    // Utilities
    getTemplatesByType,
    getActiveTemplates,
    getDefaultTemplates,
    getTemplateById,
  };
}
