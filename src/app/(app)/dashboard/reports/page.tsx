"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, TrendingUp, TrendingDown, DollarSign, Users, Calendar, BarChart3, PieChart, FileText } from "lucide-react";
import { OverviewChart } from "@/components/dashboard/overview-chart";
import { CalendarDateRangePicker } from "@/components/reports/date-range-picker";
import { useFirebase, useMemoFirebase } from "@/firebase";
import { useCollection } from "@/firebase/firestore/use-collection";
import { collection } from "firebase/firestore";
import type { Client, Expense, Panel, Plan } from "@/lib/definitions";
import { format, isWithinInterval, parseISO, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ReportsPage() {
    const { firestore, user } = useFirebase();
    const resellerId = user?.uid;
    const [dateRange, setDateRange] = useState({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date())
    });

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

    const { data: clients } = useCollection<Client>(clientsCollection);
    const { data: expenses } = useCollection<Expense>(expensesCollection);
    const { data: panels } = useCollection<Panel>(panelsCollection);
    const { data: plans } = useCollection<Plan>(plansCollection);

    // Calculate automatic panel expenses (same logic as dashboard)
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

    // Calculate metrics for selected period
    const metrics = useMemo(() => {
        if (!clients || !expenses) return {
            totalRevenue: 0,
            totalExpenses: 0,
            registeredExpenses: 0,
            panelExpenses: 0,
            netProfit: 0,
            activeClients: 0,
            clientsInPeriod: 0,
            expensesInPeriod: 0,
            averageClientValue: 0,
            monthlyGrowth: 0
        };

        // Filter clients active in the period
        const activeClients = clients.filter(client => client.status === 'active');
        const totalRevenue = activeClients.reduce((sum, client) => sum + client.paymentValue, 0);

        // Filter expenses in the selected period
        const expensesInPeriod = expenses.filter(expense => {
            const expenseDate = parseISO(expense.date);
            return isWithinInterval(expenseDate, { start: dateRange.from, end: dateRange.to });
        });

        const registeredExpenses = expensesInPeriod.reduce((sum, expense) => sum + expense.value, 0);
        const totalExpenses = registeredExpenses + panelExpenses;
        const netProfit = totalRevenue - totalExpenses;

        // Calculate clients added in period
        const clientsInPeriod = clients.filter(client => {
            const startDate = parseISO(client.startDate);
            return isWithinInterval(startDate, { start: dateRange.from, end: dateRange.to });
        }).length;

        const averageClientValue = activeClients.length > 0 ? totalRevenue / activeClients.length : 0;

        // Calculate growth compared to previous month
        const previousMonth = subMonths(dateRange.from, 1);
        const previousMonthStart = startOfMonth(previousMonth);
        const previousMonthEnd = endOfMonth(previousMonth);
        
        const previousMonthExpenses = expenses.filter(expense => {
            const expenseDate = parseISO(expense.date);
            return isWithinInterval(expenseDate, { start: previousMonthStart, end: previousMonthEnd });
        }).reduce((sum, expense) => sum + expense.value, 0);

        const previousNetProfit = totalRevenue - previousMonthExpenses;
        const monthlyGrowth = previousNetProfit > 0 ? ((netProfit - previousNetProfit) / previousNetProfit) * 100 : 0;

        return {
            totalRevenue,
            totalExpenses,
            registeredExpenses,
            panelExpenses,
            netProfit,
            activeClients: activeClients.length,
            clientsInPeriod,
            expensesInPeriod: expensesInPeriod.length,
            averageClientValue,
            monthlyGrowth
        };
    }, [clients, expenses, dateRange]);

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-2">
                        <h1 className="text-4xl font-headline font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
                            Relatórios Financeiros
                        </h1>
                        <p className="text-lg text-slate-600 dark:text-slate-400">
                            Análise completa do seu desempenho financeiro
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <CalendarDateRangePicker />
                        <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
                            <Download className="mr-2 h-4 w-4" />
                            Exportar
                        </Button>
                    </div>
                </div>
                
                {/* Period Info */}
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <Calendar className="h-4 w-4" />
                    <span>
                        Período: {format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR })} - {format(dateRange.to, 'dd/MM/yyyy', { locale: ptBR })}
                    </span>
                </div>
            </div>

            {/* Main Metrics */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 animate-slide-up">
                <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-50 via-blue-50 to-indigo-100 dark:from-blue-950/50 dark:via-blue-900/30 dark:to-indigo-950/50 shadow-lg hover:shadow-xl transition-all duration-300 group">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-sm font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                                    Receita Bruta
                                </CardTitle>
                                <CardDescription className="text-xs text-blue-600/70 dark:text-blue-400/70">
                                    Total do período
                                </CardDescription>
                            </div>
                            <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-3 shadow-lg group-hover:scale-110 transition-transform duration-300">
                                <DollarSign className="h-5 w-5 text-white" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-headline font-bold text-blue-900 dark:text-blue-100">
                            R$ {metrics.totalRevenue.toFixed(2)}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-200">
                                {metrics.activeClients} clientes ativos
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-red-50 via-orange-50 to-red-100 dark:from-red-950/50 dark:via-orange-900/30 dark:to-red-950/50 shadow-lg hover:shadow-xl transition-all duration-300 group">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-sm font-semibold text-red-700 dark:text-red-300 uppercase tracking-wide">
                                    Despesas Totais
                                </CardTitle>
                                <CardDescription className="text-xs text-red-600/70 dark:text-red-400/70">
                                    Período selecionado
                                </CardDescription>
                            </div>
                            <div className="rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 p-3 shadow-lg group-hover:scale-110 transition-transform duration-300">
                                <TrendingDown className="h-5 w-5 text-white" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-headline font-bold text-red-900 dark:text-red-100">
                            R$ {metrics.totalExpenses.toFixed(2)}
                        </p>
                        <div className="space-y-1 mt-2">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-red-600/70 dark:text-red-400/70">Registradas:</span>
                                <span className="font-medium text-red-800 dark:text-red-200">R$ {metrics.registeredExpenses.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-red-600/70 dark:text-red-400/70">Painéis:</span>
                                <span className="font-medium text-red-800 dark:text-red-200">R$ {metrics.panelExpenses.toFixed(2)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100 dark:from-emerald-950/50 dark:via-green-900/30 dark:to-emerald-950/50 shadow-lg hover:shadow-xl transition-all duration-300 group">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
                                    Lucro Líquido
                                </CardTitle>
                                <CardDescription className="text-xs text-emerald-600/70 dark:text-emerald-400/70">
                                    Receita - Despesas
                                </CardDescription>
                            </div>
                            <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 p-3 shadow-lg group-hover:scale-110 transition-transform duration-300">
                                <TrendingUp className="h-5 w-5 text-white" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className={`text-3xl font-headline font-bold ${metrics.netProfit >= 0 ? 'text-emerald-900 dark:text-emerald-100' : 'text-red-900 dark:text-red-100'}`}>
                            R$ {metrics.netProfit.toFixed(2)}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                            <Badge 
                                variant="outline" 
                                className={`text-xs ${
                                    metrics.monthlyGrowth >= 0 
                                        ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                                        : 'bg-red-100 text-red-700 border-red-200'
                                }`}
                            >
                                {metrics.monthlyGrowth >= 0 ? '+' : ''}{metrics.monthlyGrowth.toFixed(1)}% vs mês anterior
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-purple-50 via-violet-50 to-purple-100 dark:from-purple-950/50 dark:via-violet-900/30 dark:to-purple-950/50 shadow-lg hover:shadow-xl transition-all duration-300 group">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-sm font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide">
                                    Ticket Médio
                                </CardTitle>
                                <CardDescription className="text-xs text-purple-600/70 dark:text-purple-400/70">
                                    Por cliente ativo
                                </CardDescription>
                            </div>
                            <div className="rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 p-3 shadow-lg group-hover:scale-110 transition-transform duration-300">
                                <Users className="h-5 w-5 text-white" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-headline font-bold text-purple-900 dark:text-purple-100">
                            R$ {metrics.averageClientValue.toFixed(2)}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700 border-purple-200">
                                {metrics.clientsInPeriod} novos no período
                            </Badge>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Section */}
            <div className="grid gap-8 lg:grid-cols-3 animate-scale-in">
                <Card className="lg:col-span-2 border-0 shadow-xl bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50 hover:shadow-2xl transition-all duration-300">
                    <CardHeader className="pb-6 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="space-y-2">
                                <CardTitle className="text-2xl font-headline font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
                                    Evolução Mensal
                                </CardTitle>
                                <CardDescription className="text-slate-600 dark:text-slate-400">
                                    Acompanhe o crescimento dos últimos 12 meses
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
                                    <BarChart3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                    <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                                        Dados reais
                                    </span>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <OverviewChart />
                    </CardContent>
                </Card>

                {/* Summary Card */}
                <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50 hover:shadow-2xl transition-all duration-300">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-xl font-headline font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent flex items-center gap-2">
                            <PieChart className="h-5 w-5" />
                            Resumo do Período
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3">
                            <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Margem de Lucro</span>
                                <span className="text-sm font-bold text-blue-900 dark:text-blue-100">
                                    {metrics.totalRevenue > 0 ? ((metrics.netProfit / metrics.totalRevenue) * 100).toFixed(1) : 0}%
                                </span>
                            </div>
                            
                            <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                                <span className="text-sm font-medium text-green-800 dark:text-green-200">ROI Mensal</span>
                                <span className="text-sm font-bold text-green-900 dark:text-green-100">
                                    {metrics.totalExpenses > 0 ? ((metrics.netProfit / metrics.totalExpenses) * 100).toFixed(1) : 0}%
                                </span>
                            </div>
                            
                            <div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                                <span className="text-sm font-medium text-purple-800 dark:text-purple-200">Receita por Cliente</span>
                                <span className="text-sm font-bold text-purple-900 dark:text-purple-100">
                                    R$ {metrics.averageClientValue.toFixed(2)}
                                </span>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                            <Button variant="outline" className="w-full" size="sm">
                                <FileText className="mr-2 h-4 w-4" />
                                Relatório Detalhado
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
