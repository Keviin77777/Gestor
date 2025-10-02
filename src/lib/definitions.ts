export type Client = {
  id: string;
  name: string;
  startDate: string;
  plan: string;
  value: number;
  status: 'active' | 'inactive' | 'late';
  renewalDate: string;
};

export type Panel = {
  id: string;
  name: string;
  type: 'XUI' | 'Xtream' | 'Other';
  login: string;
  monthlyCost: number;
};

export type Plan = {
  id:string;
  name: string;
  value: number;
  duration: 'monthly' | 'quarterly' | 'yearly';
  panelId: string;
};

export type Expense = {
  id: string;
  date: string;
  description: string;
  type: 'fixed' | 'variable';
  value: number;
};

export type MonthlyProfit = {
  month: string;
  profit: number;
};
