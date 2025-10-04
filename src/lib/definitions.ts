export type Client = {
  id: string;
  resellerId: string;
  name: string;
  startDate: string; // ISO 8601 format
  planId: string;
  paymentValue: number;
  status: 'active' | 'inactive' | 'late';
  renewalDate: string; // ISO 8601 format
  phone?: string;
  username?: string;
  password?: string;
  notes?: string;
  panelId?: string;
  discountValue?: number;
  useFixedValue?: boolean;
  fixedValue?: number;
  apps?: string[]; // Array of app IDs
};

export type Panel = {
  id: string;
  resellerId: string;
  name: string;
  login: string;
  renewalDate: string; // ISO 8601 format
  costType: 'fixed' | 'perActive';
  monthlyCost?: number;
  costPerActive?: number;
  activeClients?: number; // This will likely be a derived/calculated value
  // Sigma IPTV Integration
  sigmaUrl?: string;
  sigmaUsername?: string;
  sigmaToken?: string;
  sigmaUserId?: string; // Auto-fetched from Sigma API
  sigmaConnected?: boolean;
  sigmaLastSync?: string; // ISO 8601 format
  sigmaDefaultPackageId?: string; // Default package ID for renewals
};

export type Plan = {
  id: string;
  resellerId: string;
  panelId: string;
  name: string;
  saleValue: number;
  duration: number; // Duration in months (1-12)
};

export type Expense = {
  id: string;
  resellerId: string;
  date: string; // ISO 8601 format
  value: number;
  type: 'fixed' | 'variable';
  description: string;
};

export type MonthlyProfit = {
  month: string;
  profit: number;
};

export type Invoice = {
  id: string;
  clientId: string;
  resellerId: string;
  dueDate: string; // ISO 8601 format
  issueDate: string; // ISO 8601 format
  value: number;
  discount: number;
  finalValue: number;
  status: 'pending' | 'paid' | 'overdue';
  paymentDate?: string; // ISO 8601 format
  paymentMethod?: string;
  description: string;
};

export type App = {
  id: string;
  resellerId: string;
  name: string;
  description?: string;
  createdAt: string; // ISO 8601 format
};

    