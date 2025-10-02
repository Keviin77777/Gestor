export type Client = {
  id: string;
  resellerId: string;
  name: string;
  startDate: string; // ISO 8601 format
  planId: string;
  paymentValue: number;
  status: 'active' | 'inactive' | 'late';
  renewalDate: string; // ISO 8601 format
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
};

export type Plan = {
  id: string;
  resellerId: string;
  panelId: string;
  name: string;
  saleValue: number;
  duration: 'monthly' | 'quarterly' | 'yearly';
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

    