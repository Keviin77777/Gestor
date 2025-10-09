/**
 * MySQL API Client
 * Secure client for communicating with the PHP MySQL backend
 */

import type { App, Invoice } from './definitions';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9002';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

export interface Client {
  id: string;
  reseller_id: string;
  name: string;
  username?: string;
  email?: string;
  phone?: string;
  password?: string;
  plan_id?: string;
  panel_id?: string;
  start_date: string;
  renewal_date: string;
  status: 'active' | 'inactive' | 'suspended' | 'expired';
  value: number;
  discount_value?: number;
  use_fixed_value?: boolean;
  fixed_value?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  plan_name?: string;
  panel_name?: string;
  apps?: string[];
}

export interface Panel {
  id: string;
  reseller_id: string;
  name: string;
  type?: string;
  url?: string;
  login?: string;
  monthly_cost: number;
  renewal_date?: string;
  sigma_connected: boolean;
  sigma_url?: string;
  sigma_username?: string;
  sigma_token?: string;
  sigma_user_id?: string;
  sigma_default_package_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Plan {
  id: string;
  reseller_id: string;
  panel_id?: string;
  name: string;
  value: number;
  duration_days: number;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  reseller_id: string;
  date: string;
  value: number;
  type: 'fixed' | 'variable' | 'panel' | 'app' | 'tool' | 'credit' | 'license' | 'other';
  category?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Revenue {
  id: string;
  reseller_id: string;
  client_id?: string;
  date: string;
  value: number;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  display_name?: string;
  email_verified: boolean;
  photo_url?: string;
  created_at?: string;
  last_login?: string;
}

class MySQLApiClient {
  private token: string | null = null;
  private refreshPromise: Promise<void> | null = null;

  constructor() {
    // Load token from localStorage on initialization
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  /**
   * Set authentication token
   */
  setToken(token: string): void {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  /**
   * Clear authentication token
   */
  clearToken(): void {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  /**
   * Get current token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Make HTTP request to API
   */
  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (options.headers) {
      Object.assign(headers, options.headers);
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const url = `${API_URL}${endpoint}`;
    
    console.log('🌐 API Request:', {
      url,
      endpoint,
      method: options.method || 'GET',
      hasAuth: !!this.token
    });

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });
      
      console.log('📡 API Response:', {
        url,
        status: response.status,
        ok: response.ok
      });

      // Handle 401 Unauthorized - try to refresh token
      if (response.status === 401 && this.token && !endpoint.includes('/auth/')) {
        await this.refreshToken();
        // Retry the request with new token
        return this.request(endpoint, options);
      }

      const data = await response.json();
      
      console.log('📦 API Response Data:', {
        endpoint,
        dataType: typeof data,
        isArray: Array.isArray(data),
        length: Array.isArray(data) ? data.length : 'N/A',
        keys: typeof data === 'object' && data !== null ? Object.keys(data) : 'N/A',
        sample: Array.isArray(data) ? data[0] : data
      });

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }

  // ============================================================================
  // Authentication Methods
  // ============================================================================

  /**
   * Register new user
   */
  async register(email: string, password: string, displayName?: string): Promise<{ token: string; user: User }> {
    const data = await this.request<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, display_name: displayName }),
    });

    if (data.token) {
      this.setToken(data.token);
    }

    return data;
  }

  /**
   * Login user
   */
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const data = await this.request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (data.token) {
      this.setToken(data.token);
    }

    return data;
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.clearToken();
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<void> {
    // Prevent multiple simultaneous refresh requests
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const data = await this.request<{ token: string }>('/auth/refresh', {
          method: 'POST',
        });

        if (data.token) {
          this.setToken(data.token);
        }
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<User> {
    const data = await this.request<{ user: User }>('/auth/me');
    return data.user;
  }

  // ============================================================================
  // Client Methods
  // ============================================================================

  /**
   * Get all clients
   */
  async getClients(params?: {
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ clients: Client[]; total: number }> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const query = queryParams.toString();
    return this.request(`/clients${query ? `?${query}` : ''}`);
  }

  /**
   * Get single client
   */
  async getClient(id: string): Promise<Client> {
    const data = await this.request<{ client: Client }>(`/clients/${id}`);
    return data.client;
  }

  /**
   * Create new client
   */
  async createClient(client: Partial<Client>): Promise<Client> {
    const data = await this.request<{ client: Client }>('/clients', {
      method: 'POST',
      body: JSON.stringify(client),
    });
    return data.client;
  }

  /**
   * Update client
   */
  async updateClient(id: string, client: Partial<Client>): Promise<void> {
    await this.request(`/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(client),
    });
  }

  /**
   * Delete client
   */
  async deleteClient(id: string): Promise<void> {
    await this.request(`/clients/${id}`, {
      method: 'DELETE',
    });
  }

  // ============================================================================
  // Panel Methods
  // ============================================================================

  async getPanels(): Promise<Panel[]> {
    const data = await this.request<{ panels: Panel[] }>('/panels');
    return data.panels;
  }

  async getPanel(id: string): Promise<Panel> {
    const data = await this.request<{ panel: Panel }>(`/panels/${id}`);
    return data.panel;
  }

  async createPanel(panel: Partial<Panel>): Promise<Panel> {
    const data = await this.request<{ panel: Panel }>('/panels', {
      method: 'POST',
      body: JSON.stringify(panel),
    });
    return data.panel;
  }

  async updatePanel(id: string, panel: Partial<Panel>): Promise<void> {
    await this.request(`/panels/${id}`, {
      method: 'PUT',
      body: JSON.stringify(panel),
    });
  }

  async deletePanel(id: string): Promise<void> {
    await this.request(`/panels/${id}`, {
      method: 'DELETE',
    });
  }

  // ============================================================================
  // Plan Methods
  // ============================================================================

  async getPlans(): Promise<Plan[]> {
    const data = await this.request<{ plans: Plan[] }>('/plans');
    return data.plans || [];
  }

  async getPlan(id: string): Promise<Plan> {
    const data = await this.request<{ plan: Plan }>(`/plans/${id}`);
    return data.plan;
  }

  async createPlan(plan: Partial<Plan>): Promise<Plan> {
    const data = await this.request<{ plan: Plan }>('/plans', {
      method: 'POST',
      body: JSON.stringify(plan),
    });
    return data.plan;
  }

  async updatePlan(id: string, plan: Partial<Plan>): Promise<void> {
    await this.request(`/plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(plan),
    });
  }

  async deletePlan(id: string): Promise<void> {
    await this.request(`/plans/${id}`, {
      method: 'DELETE',
    });
  }

  // ============================================================================
  // Expense Methods
  // ============================================================================

  async getExpenses(params?: { date?: string }): Promise<Expense[]> {
    const queryParams = new URLSearchParams();
    if (params?.date) queryParams.append('date', params.date);

    const query = queryParams.toString();
    const data = await this.request<{ expenses: Expense[] }>(`/expenses${query ? `?${query}` : ''}`);
    return data.expenses;
  }

  async createExpense(expense: Partial<Expense>): Promise<Expense> {
    const data = await this.request<{ expense: Expense }>('/expenses', {
      method: 'POST',
      body: JSON.stringify(expense),
    });
    return data.expense;
  }

  async updateExpense(id: string, expense: Partial<Expense>): Promise<void> {
    await this.request(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(expense),
    });
  }

  async deleteExpense(id: string): Promise<void> {
    await this.request(`/expenses/${id}`, {
      method: 'DELETE',
    });
  }

  // ============================================================================
  // Revenue Methods
  // ============================================================================

  async getRevenues(params?: { date?: string }): Promise<Revenue[]> {
    const queryParams = new URLSearchParams();
    if (params?.date) queryParams.append('date', params.date);

    const query = queryParams.toString();
    const data = await this.request<{ revenues: Revenue[] }>(`/revenues${query ? `?${query}` : ''}`);
    return data.revenues;
  }

  async createRevenue(revenue: Partial<Revenue>): Promise<Revenue> {
    const data = await this.request<{ revenue: Revenue }>('/revenues', {
      method: 'POST',
      body: JSON.stringify(revenue),
    });
    return data.revenue;
  }

  // ============================================================================
  // Dashboard Methods
  // ============================================================================

  async getDashboardSummary(): Promise<any> {
    return this.request('/dashboard/summary');
  }

  async getDashboardCharts(): Promise<any> {
    return this.request('/dashboard/charts');
  }

  async getExpiringClients(): Promise<Client[]> {
    const data = await this.request<{ clients: Client[] }>('/dashboard/expiring');
    return data.clients;
  }

  // ============================================================================
  // Generic GET Method
  // ============================================================================

  /**
   * Generic GET method for any endpoint
   */
  async get<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint);
  }

  // ============================================================================
  // Apps Methods
  // ============================================================================

  async getApps(): Promise<App[]> {
    const data = await this.request<{ apps: App[] }>('/apps');
    return data.apps || [];
  }

  async getApp(id: string): Promise<App> {
    const data = await this.request<{ app: App }>(`/apps/${id}`);
    return data.app;
  }

  async createApp(app: Partial<App>): Promise<App> {
    const data = await this.request<{ app: App }>('/apps', {
      method: 'POST',
      body: JSON.stringify(app),
    });
    return data.app;
  }

  async updateApp(id: string, app: Partial<App>): Promise<void> {
    await this.request(`/apps/${id}`, {
      method: 'PUT',
      body: JSON.stringify(app),
    });
  }

  async deleteApp(id: string): Promise<void> {
    await this.request(`/apps/${id}`, {
      method: 'DELETE',
    });
  }

  // Invoices methods
  async getInvoices(): Promise<Invoice[]> {
    const data = await this.request<any>('/invoices');
    // A API retorna { invoices: [...] } ao invés de [...] diretamente
    if (data && typeof data === 'object' && 'invoices' in data && Array.isArray(data.invoices)) {
      return data.invoices;
    }
    // Fallback: se já for array, retorna direto
    return Array.isArray(data) ? data : [];
  }

  async getInvoice(id: string): Promise<Invoice> {
    const data = await this.request<Invoice>(`/invoices/${id}`);
    return data;
  }

  async createInvoice(invoice: Partial<Invoice>): Promise<Invoice> {
    const data = await this.request<{ invoice: Invoice }>('/invoices', {
      method: 'POST',
      body: JSON.stringify(invoice),
    });
    return data.invoice;
  }

  async updateInvoice(id: string, invoice: Partial<Invoice>): Promise<void> {
    await this.request(`/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(invoice),
    });
  }

  async deleteInvoice(id: string): Promise<void> {
    await this.request(`/invoices/${id}`, {
      method: 'DELETE',
    });
  }

  async markInvoiceAsPaid(id: string, paymentDate?: string): Promise<{ success: boolean; message: string; invoice: Invoice; client_updated?: boolean; new_renewal_date?: string; sigma_renewed?: boolean; sigma_response?: any }> {
    const data = await this.request<{ success: boolean; message: string; invoice: Invoice; client_updated?: boolean; new_renewal_date?: string; sigma_renewed?: boolean; sigma_response?: any }>(`/invoices/${id}/mark-paid`, {
      method: 'POST',
      body: JSON.stringify({ payment_date: paymentDate || new Date().toISOString().split('T')[0] }),
    });
    return data;
  }

  async unmarkInvoiceAsPaid(id: string): Promise<{ success: boolean; message: string; invoice: Invoice; client_updated?: boolean; previous_renewal_date?: string; current_renewal_date?: string }> {
    const data = await this.request<{ success: boolean; message: string; invoice: Invoice; client_updated?: boolean; previous_renewal_date?: string; current_renewal_date?: string }>(`/invoices/${id}/unmark-paid`, {
      method: 'POST',
    });
    return data;
  }

  // WhatsApp Reminder Templates methods
  async getReminderTemplates(): Promise<any[]> {
    const data = await this.request<any[]>('/whatsapp-reminder-templates');
    return data;
  }

  async getReminderTemplate(id: string): Promise<any> {
    const data = await this.request<any>(`/whatsapp-reminder-templates/${id}`);
    return data;
  }

  async createReminderTemplate(template: any): Promise<any> {
    const data = await this.request<any>('/whatsapp-reminder-templates', {
      method: 'POST',
      body: JSON.stringify(template),
    });
    return data;
  }

  async updateReminderTemplate(id: string, template: any): Promise<any> {
    const data = await this.request<any>(`/whatsapp-reminder-templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(template),
    });
    return data;
  }

  async deleteReminderTemplate(id: string): Promise<void> {
    await this.request(`/whatsapp-reminder-templates/${id}`, {
      method: 'DELETE',
    });
  }

  // WhatsApp Reminder Settings methods
  async getReminderSettings(): Promise<any> {
    const data = await this.request<any>('/whatsapp-reminder-settings');
    return data;
  }

  async updateReminderSettings(settings: any): Promise<any> {
    const data = await this.request<any>('/whatsapp-reminder-settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
    return data;
  }

  async resetReminderSettings(): Promise<any> {
    const data = await this.request<any>('/whatsapp-reminder-settings', {
      method: 'POST',
    });
    return data;
  }

  // WhatsApp Reminder Logs methods
  async getReminderLogs(params?: any): Promise<any> {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    const data = await this.request<any>(`/whatsapp-reminder-logs${queryString}`);
    return data;
  }

  async getReminderStats(): Promise<any> {
    const data = await this.request<any>('/whatsapp-reminder-logs/stats');
    return data;
  }

  async retryReminderLog(id: string): Promise<any> {
    const data = await this.request<any>(`/whatsapp-reminder-logs/${id}/retry`, {
      method: 'POST',
    });
    return data;
  }

  async updateReminderLog(id: string, logData: any): Promise<any> {
    const data = await this.request<any>(`/whatsapp-reminder-logs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(logData),
    });
    return data;
  }

  async createReminderLog(logData: any): Promise<any> {
    const data = await this.request<any>('/whatsapp-reminder-logs', {
      method: 'POST',
      body: JSON.stringify(logData),
    });
    return data;
  }

  async cleanupReminderLogs(days: number = 90): Promise<any> {
    const data = await this.request<any>('/whatsapp-reminder-logs/cleanup', {
      method: 'POST',
      body: JSON.stringify({ days }),
    });
    return data;
  }
}

// Export singleton instance
export const mysqlApi = new MySQLApiClient();

// Export class for testing
export { MySQLApiClient };
