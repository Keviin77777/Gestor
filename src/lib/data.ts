import type { Client, Panel, Plan, Expense, MonthlyProfit } from './definitions';

export const clients: Client[] = [
  { id: '1', name: 'João Silva', startDate: '2024-06-15', plan: 'Plano Básico', value: 35, status: 'active', renewalDate: '2024-07-15' },
  { id: '2', name: 'Maria Oliveira', startDate: '2024-05-20', plan: 'Plano Premium', value: 50, status: 'active', renewalDate: '2024-07-20' },
  { id: '3', name: 'Carlos Pereira', startDate: '2024-04-10', plan: 'Plano Básico', value: 35, status: 'late', renewalDate: '2024-06-10' },
  { id: '4', name: 'Ana Costa', startDate: '2024-06-01', plan: 'Plano Trimestral', value: 90, status: 'active', renewalDate: '2024-09-01' },
  { id: '5', name: 'Pedro Martins', startDate: '2023-07-25', plan: 'Plano Anual', value: 360, status: 'inactive', renewalDate: '2024-07-25' },
];

export const panels: Panel[] = [
    { id: 'p1', name: 'Painel Principal', type: 'XUI', login: 'admin', monthlyCost: 150 },
    { id: 'p2', name: 'Painel Secundário', type: 'Xtream', login: 'user1', monthlyCost: 100 },
];

export const plans: Plan[] = [
    { id: 'pl1', name: 'Plano Básico', value: 35, duration: 'monthly', panelId: 'p1' },
    { id: 'pl2', name: 'Plano Premium', value: 50, duration: 'monthly', panelId: 'p1' },
    { id: 'pl3', name: 'Plano Trimestral', value: 90, duration: 'quarterly', panelId: 'p2' },
    { id: 'pl4', name: 'Plano Anual', value: 360, duration: 'yearly', panelId: 'p1' },
];

export const expenses: Expense[] = [
  { id: 'e1', date: '2024-07-01', description: 'Custo Painel Principal', type: 'fixed', value: 150 },
  { id: 'e2', date: '2024-07-01', description: 'Custo Painel Secundário', type: 'fixed', value: 100 },
  { id: 'e3', date: '2024-07-05', description: 'Compra de créditos', type: 'variable', value: 200 },
  { id: 'e4', date: '2024-06-10', description: 'Domínio site', type: 'fixed', value: 50 },
];

export const monthlyProfits: MonthlyProfit[] = [
  { month: 'Jan', profit: 1200 },
  { month: 'Fev', profit: 1500 },
  { month: 'Mar', profit: 1300 },
  { month: 'Abr', profit: 1800 },
  { month: 'Mai', profit: 1600 },
  { month: 'Jun', profit: 2100 },
  { month: 'Jul', profit: 1950 },
  { month: 'Ago', profit: 2300 },
  { month: 'Set', profit: 2200 },
  { month: 'Out', profit: 2500 },
  { month: 'Nov', profit: 2800 },
  { month: 'Dez', profit: 3200 },
];
