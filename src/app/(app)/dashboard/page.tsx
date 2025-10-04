"use client";

import React, { useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, Users, CreditCard, Activity, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { OverviewChart } from "@/components/dashboard/overview-chart";
import { SmartNotifications } from "@/components/dashboard/smart-notifications";
import { RecentClients } from "@/components/dashboard/recent-clients";
import { useFirebase, useMemoFirebase } from "@/firebase";
import { useCollection } from "@/firebase/firestore/use-collection";
import { collection } from "firebase/firestore";
import type { Client, Expense, Panel, Plan, Invoice } from "@/lib/definitions";

export default function DashboardPage() {
  const { firestore, user } = useFirebase();
  const resellerId = user?.uid;

  // Collections
  const clientsCollection = useMemoFirebase(() => {
    if (!resellerId) return null;
    return collection(firestore, 'resellers', resellerId, 'clients');
  }, [firestore, resellerId]);

  const expensesCollection = useMemoFirebase(() => {
    if (!resellerId) return null;
    return collection(firestore, 'resellers', resellerId, 'expenses');
  }, [firestore, resellerId]);

  const panelsCollection = useMemoFirebase(() => {
    if (!resellerId) return null;
    return collection(firestore, 'resellers', resellerId, 'panels');
  }, [firestore, resellerId]);

  const plansCollection = useMemoFirebase(() => {
    if (!resellerId) return null;
    return collection(firestore, 'resellers', resellerId, 'plans');
  }, [firestore, resellerId]);

  const invoicesCollection = useMemoFirebase(() => {
    if (!resellerId) return null;
    return collection(firestore, 'resellers', resellerId, 'invoices');
  }, [firestore, resellerId]);

  const { data: clients } = useCollection<Client>(clientsCollection);
  const { data: expenses } = useCollection<Expense>(expensesCollection);
  const { data: panels } = useCollection<Panel>(panelsCollection);
  const { data: plans } = useCollection<Plan>(plansCollection);
  const { data: invoices } = useCollection<Invoice>(invoicesCollection);

  // Calculate automatic panel expenses
  const panelExpenses = useMemo(() => {
    if (!panels || !clients || !plans) return 0;

    return panels.reduce((total, panel) => {
      // Find plans for this panel
      const panelPlans = plans.filter(plan => plan.panelId === panel.id);

      // Find active clients using plans from this panel
      const activeClientsInPanel = clients.filter(client =>
        client.status === 'active' &&
        panelPlans.some(plan => plan.id === client.planId)
      );

      let cost = 0;
      if (panel.costType === 'fixed' && panel.monthlyCost) {
        cost = panel.monthlyCost;
      } else if (panel.costType === 'perActive' && panel.costPerActive) {
        cost = panel.costPerActive * activeClientsInPanel.length;
      }

      return total + cost;
    }, 0);
  }, [panels, clients, plans]);

  // Calculate comprehensive stats
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const currentYear = new Date().getFullYear();
  const today = new Date();

  // 1. Receita Bruta (Total potential revenue - all clients)
  const totalGrossRevenue = clients?.reduce((sum, client) => sum + client.paymentValue, 0) || 0;

  // 2. Saldo Líquido Mensal (Monthly paid invoices)
  const monthlyPaidRevenue = useMemo(() => {
    if (!invoices) return 0;

    return invoices
      .filter(invoice => {
        if (invoice.status !== 'paid' || !invoice.paymentDate) return false;

        const paymentDate = new Date(invoice.paymentDate);
        return paymentDate.getMonth() + 1 === currentMonth &&
          paymentDate.getFullYear() === currentYear;
      })
      .reduce((sum, invoice) => sum + invoice.finalValue, 0);
  }, [invoices, currentMonth, currentYear]);

  // 3. Saldo Líquido Anual (Annual paid invoices)
  const annualPaidRevenue = useMemo(() => {
    if (!invoices) return 0;

    return invoices
      .filter(invoice => {
        if (invoice.status !== 'paid' || !invoice.paymentDate) return false;

        const paymentDate = new Date(invoice.paymentDate);
        return paymentDate.getFullYear() === currentYear;
      })
      .reduce((sum, invoice) => sum + invoice.finalValue, 0);
  }, [invoices, currentYear]);

  // 4. Clientes Vencidos (Overdue clients)
  const overdueClients = useMemo(() => {
    if (!clients) return { count: 0, value: 0 };

    const overdue = clients.filter(client => {
      const renewalDate = new Date(client.renewalDate);
      return renewalDate < today && client.status === 'active';
    });

    return {
      count: overdue.length,
      value: overdue.reduce((sum, client) => sum + client.paymentValue, 0)
    };
  }, [clients, today]);

  // Other stats
  const activeClients = clients?.filter(client => client.status === 'active').length || 0;
  const registeredExpenses = expenses?.reduce((sum, expense) => sum + expense.value, 0) || 0;
  const totalExpenses = registeredExpenses + panelExpenses;

  // Net revenue calculation (Gross Revenue - Total Expenses)
  const netRevenue = totalGrossRevenue - totalExpenses;

  // Calculate growth (simplified - comparing current month vs previous month)
  const currentMonthForGrowth = new Date().getMonth();
  const currentYearForGrowth = new Date().getFullYear();

  const currentMonthClients = clients?.filter(client => {
    const clientDate = new Date(client.startDate);
    return clientDate.getMonth() === currentMonthForGrowth && clientDate.getFullYear() === currentYearForGrowth;
  }).length || 0;

  const previousMonthClients = clients?.filter(client => {
    const clientDate = new Date(client.startDate);
    const prevMonth = currentMonthForGrowth === 0 ? 11 : currentMonthForGrowth - 1;
    const prevYear = currentMonthForGrowth === 0 ? currentYearForGrowth - 1 : currentYearForGrowth;
    return clientDate.getMonth() === prevMonth && clientDate.getFullYear() === prevYear;
  }).length || 0;

  const clientGrowth = previousMonthClients > 0 ? ((currentMonthClients - previousMonthClients) / previousMonthClients * 100) : 0;
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-headline font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
              Bem-vindo de volta! 👋
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl">
              Aqui está um resumo do seu negócio hoje. Tudo está funcionando perfeitamente!
            </p>
          </div>
          <div className="hidden lg:flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {new Date().toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Última atualização: agora
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards - Primeira Fileira */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 animate-slide-up">
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-50 via-blue-50 to-indigo-100 dark:from-blue-950/50 dark:via-blue-900/30 dark:to-indigo-950/50 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="space-y-1">
              <CardTitle className="text-sm font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                Receita Bruta
              </CardTitle>
              <p className="text-xs text-blue-600/70 dark:text-blue-400/70">Este mês</p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-3 shadow-lg group-hover:scale-110 transition-transform duration-300">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-headline font-bold text-blue-900 dark:text-blue-100">
              R$ {totalGrossRevenue.toFixed(2)}
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <div className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="h-4 w-4" />
                <span className="font-medium">+12.5%</span>
              </div>
              <span className="text-slate-500 dark:text-slate-400">vs mês anterior</span>
            </div>
          </CardContent>
          <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-gradient-to-br from-blue-400/10 to-indigo-500/10 group-hover:scale-110 transition-transform duration-500"></div>
        </Card>

        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-50 via-green-50 to-teal-100 dark:from-emerald-950/50 dark:via-green-900/30 dark:to-teal-950/50 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="space-y-1">
              <CardTitle className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
                Clientes Ativos
              </CardTitle>
              <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">Total ativo</p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-3 shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Users className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-headline font-bold text-emerald-900 dark:text-emerald-100">
              {activeClients}
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <div className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400">
                <ArrowUpRight className="h-4 w-4" />
                <span className="font-medium">{clientGrowth > 0 ? `+${clientGrowth.toFixed(1)}%` : '0%'}</span>
              </div>
              <span className="text-slate-500 dark:text-slate-400">vs mês anterior</span>
            </div>
          </CardContent>
          <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-gradient-to-br from-emerald-400/10 to-teal-500/10 group-hover:scale-110 transition-transform duration-500"></div>
        </Card>

        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-amber-50 via-orange-50 to-red-100 dark:from-amber-950/50 dark:via-orange-900/30 dark:to-red-950/50 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="space-y-1">
              <CardTitle className="text-sm font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide">
                Despesas
              </CardTitle>
              <p className="text-xs text-amber-600/70 dark:text-amber-400/70">Este mês</p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-red-600 p-3 shadow-lg group-hover:scale-110 transition-transform duration-300">
              <CreditCard className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-headline font-bold text-amber-900 dark:text-amber-100">
              R$ {totalExpenses.toFixed(2)}
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-amber-600/70 dark:text-amber-400/70">Registradas:</span>
                <span className="font-medium text-amber-800 dark:text-amber-200">R$ {registeredExpenses.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-amber-600/70 dark:text-amber-400/70">Painéis:</span>
                <span className="font-medium text-amber-800 dark:text-amber-200">R$ {panelExpenses.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
          <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-gradient-to-br from-amber-400/10 to-red-500/10 group-hover:scale-110 transition-transform duration-500"></div>
        </Card>

        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-100 dark:from-violet-950/50 dark:via-purple-900/30 dark:to-fuchsia-950/50 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="space-y-1">
              <CardTitle className="text-sm font-semibold text-violet-700 dark:text-violet-300 uppercase tracking-wide">
                Receita Líquida
              </CardTitle>
              <p className="text-xs text-violet-600/70 dark:text-violet-400/70">Lucro real</p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 p-3 shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Activity className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-headline font-bold text-violet-900 dark:text-violet-100">
              R$ {netRevenue.toFixed(2)}
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <div className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="h-4 w-4" />
                <span className="font-medium">+18.3%</span>
              </div>
              <span className="text-slate-500 dark:text-slate-400">margem de lucro</span>
            </div>
          </CardContent>
          <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-gradient-to-br from-violet-400/10 to-fuchsia-500/10 group-hover:scale-110 transition-transform duration-500"></div>
        </Card>
      </div>

      {/* Stats Cards - Segunda Fileira */}
      <div className="grid gap-6 md:grid-cols-3 animate-slide-up">
        {/* Saldo Líquido Mensal */}
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-100 dark:from-green-950/50 dark:via-emerald-900/30 dark:to-teal-950/50 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="space-y-1">
              <CardTitle className="text-sm font-semibold text-green-700 dark:text-green-300 uppercase tracking-wide">
                Saldo Líquido
              </CardTitle>
              <p className="text-xs text-green-600/70 dark:text-green-400/70">Este mês</p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 p-3 shadow-lg group-hover:scale-110 transition-transform duration-300">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-headline font-bold text-green-900 dark:text-green-100">
              R$ {monthlyPaidRevenue.toFixed(2)}
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <div className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400">
                <ArrowUpRight className="h-4 w-4" />
                <span className="font-medium">Renovações</span>
              </div>
              <span className="text-slate-500 dark:text-slate-400">pagas</span>
            </div>
          </CardContent>
          <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-gradient-to-br from-green-400/10 to-emerald-500/10 group-hover:scale-110 transition-transform duration-500"></div>
        </Card>

        {/* Saldo Líquido Anual */}
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-cyan-50 via-sky-50 to-blue-100 dark:from-cyan-950/50 dark:via-sky-900/30 dark:to-blue-950/50 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="space-y-1">
              <CardTitle className="text-sm font-semibold text-cyan-700 dark:text-cyan-300 uppercase tracking-wide">
                Saldo Líquido
              </CardTitle>
              <p className="text-xs text-cyan-600/70 dark:text-cyan-400/70">Este ano</p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 p-3 shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Activity className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-headline font-bold text-cyan-900 dark:text-cyan-100">
              R$ {annualPaidRevenue.toFixed(2)}
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <div className="flex items-center space-x-1 text-blue-600 dark:text-blue-400">
                <ArrowUpRight className="h-4 w-4" />
                <span className="font-medium">{currentYear}</span>
              </div>
              <span className="text-slate-500 dark:text-slate-400">acumulado</span>
            </div>
          </CardContent>
          <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-gradient-to-br from-cyan-400/10 to-blue-500/10 group-hover:scale-110 transition-transform duration-500"></div>
        </Card>

        {/* Clientes Vencidos */}
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-red-50 via-rose-50 to-pink-100 dark:from-red-950/50 dark:via-rose-900/30 dark:to-pink-950/50 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="space-y-1">
              <CardTitle className="text-sm font-semibold text-red-700 dark:text-red-300 uppercase tracking-wide">
                Clientes Vencidos
              </CardTitle>
              <p className="text-xs text-red-600/70 dark:text-red-400/70">Não renovaram</p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 p-3 shadow-lg group-hover:scale-110 transition-transform duration-300">
              <TrendingDown className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-headline font-bold text-red-900 dark:text-red-100">
              {overdueClients.count}
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <div className="flex items-center space-x-1 text-red-600 dark:text-red-400">
                <ArrowDownRight className="h-4 w-4" />
                <span className="font-medium">R$ {overdueClients.value.toFixed(2)}</span>
              </div>
              <span className="text-slate-500 dark:text-slate-400">em atraso</span>
            </div>
          </CardContent>
          <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-gradient-to-br from-red-400/10 to-rose-500/10 group-hover:scale-110 transition-transform duration-500"></div>
        </Card>
      </div>

      {/* Charts and Notifications */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 animate-scale-in">
        <Card className="lg:col-span-2 border-0 shadow-xl bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50 hover:shadow-2xl transition-all duration-300">
          <CardHeader className="pb-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <CardTitle className="text-2xl font-headline font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
                  Evolução Financeira
                </CardTitle>
                <p className="text-slate-600 dark:text-slate-400">
                  Acompanhe o crescimento dos últimos 12 meses
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                    Ao vivo
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pl-2">
            <OverviewChart />
          </CardContent>
        </Card>
        <div className="space-y-6">
          <SmartNotifications />
        </div>
      </div>

      {/* Recent Clients */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50 hover:shadow-2xl transition-all duration-300">
        <CardHeader className="pb-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl font-headline font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
                Clientes Recentes
              </CardTitle>
              <p className="text-slate-600 dark:text-slate-400">
                Últimos cadastros e atividades
              </p>
            </div>
            <Button variant="outline" size="sm" className="hover:bg-slate-100 dark:hover:bg-slate-800">
              Ver todos
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <RecentClients />
        </CardContent>
      </Card>


    </div>
  );
}
