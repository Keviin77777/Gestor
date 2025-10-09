// Re-export types from mysql-api-client for consistency
export type {
  Client,
  Panel,
  Plan,
  Expense,
  Revenue,
  User,
} from './mysql-api-client';

// Additional types specific to the app
export type ClientLegacy = {
  id: string;
  resellerId: string;
  name: string;
  startDate: string;
  planId: string;
  paymentValue: number;
  status: 'active' | 'inactive' | 'late';
  renewalDate: string;
  phone?: string;
  username?: string;
  password?: string;
  notes?: string;
  panelId?: string;
  discountValue?: number;
  useFixedValue?: boolean;
  fixedValue?: number;
  apps?: string[];
};

export type MonthlyProfit = {
  month: string;
  profit: number;
};

export type Invoice = {
  id: string;
  client_id: string;
  reseller_id: string;
  due_date: string; // ISO 8601 format
  issue_date: string; // ISO 8601 format
  value: number;
  discount: number;
  final_value: number;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  payment_date?: string; // ISO 8601 format
  payment_method?: string;
  description: string;
};

export type App = {
  id: string;
  resellerId: string;
  name: string;
  description?: string;
  createdAt: string; // ISO 8601 format
};

    