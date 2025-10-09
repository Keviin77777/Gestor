"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Wallet, PieChart, TrendingDown } from "lucide-react";
import { CalendarDateRangePicker } from "@/components/reports/date-range-picker";
import { ReportChart } from "@/components/reports/report-chart";
import { useReports } from "@/hooks/use-reports";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ExpensesReportPage() {
    const [dateRange, setDateRange] = useState({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date())
    });

    const { data, isLoading } = useReports('expenses', {
        start_date: format(dateRange.from, 'yyyy-MM-dd'),
        end_date: format(dateRange.to, 'yyyy-MM-dd')
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-slate-600 dark:text-slate-400">Carregando relatório de despesas...</p>
                </div>
            </div>
        );
    }

    // Prepare chart data
    const categoryData = data?.by_category?.map((cat: any) => ({
        name: cat.category || cat.type,
        value: parseFloat(cat.total)
    })) || [];

    const totalExpenses = data?.by_category?.reduce((sum: number, cat: any) => sum + parseFloat(cat.total), 0) || 0;
    const totalPanelCosts = data?.panel_costs?.reduce((sum: number, panel: any) => sum + parseFloat(panel.monthly_cost || 0), 0) || 0;

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-2">
                        <h1 className="text-4xl font-headline font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
                            Despesas Detalhadas
                        </h1>
                        <p className="text-lg text-slate-600 dark:text-slate-400">
                            Análise completa dos gastos operacionais
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <CalendarDateRangePicker 
                            date={dateRange}
                            onDateChange={setDateRange}
                        />
                        <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
                            <Download className="mr-2 h-4 w-4" />
                            Exportar
                        </Button>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-6 md:grid-cols-3 animate-slide-up">
                <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-red-50 to-orange-100 dark:from-red-950/50 dark:to-orange-950/50 shadow-lg hover:shadow-xl transition-all duration-300">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold text-red-700 dark:text-red-300 uppercase tracking-wide">
                                Despesas Registradas
                            </CardTitle>
                            <div className="rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 p-3 shadow-lg">
                                <Wallet className="h-5 w-5 text-white" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-headline font-bold text-red-900 dark:text-red-100">
                            R$ {totalExpenses.toFixed(2)}
                        </p>
                        <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-1">
                            No período selecionado
                        </p>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-amber-50 to-yellow-100 dark:from-amber-950/50 dark:to-yellow-950/50 shadow-lg hover:shadow-xl transition-all duration-300">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide">
                                Custos de Painéis
                            </CardTitle>
                            <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 p-3 shadow-lg">
                                <TrendingDown className="h-5 w-5 text-white" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-headline font-bold text-amber-900 dark:text-amber-100">
                            R$ {totalPanelCosts.toFixed(2)}
                        </p>
                        <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-1">
                            Custo mensal dos painéis
                        </p>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-950/50 dark:to-gray-950/50 shadow-lg hover:shadow-xl transition-all duration-300">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                                Total Geral
                            </CardTitle>
                            <div className="rounded-2xl bg-gradient-to-br from-slate-500 to-gray-600 p-3 shadow-lg">
                                <PieChart className="h-5 w-5 text-white" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-headline font-bold text-slate-900 dark:text-slate-100">
                            R$ {(totalExpenses + totalPanelCosts).toFixed(2)}
                        </p>
                        <p className="text-xs text-slate-600/70 dark:text-slate-400/70 mt-1">
                            Despesas + Painéis
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Chart */}
            <div className="animate-scale-in">
                <ReportChart
                    title="Despesas por Categoria"
                    description="Distribuição dos gastos por tipo"
                    data={categoryData}
                    type="pie"
                    dataKeys={{ y: 'value' }}
                    height={400}
                />
            </div>

            {/* Tables */}
            <div className="grid gap-6 lg:grid-cols-2 animate-scale-in">
                {/* Recent Expenses */}
                <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50">
                    <CardHeader>
                        <CardTitle className="text-xl font-headline font-bold">
                            Despesas Recentes
                        </CardTitle>
                        <CardDescription>
                            Últimas despesas registradas
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {data?.recent_expenses?.slice(0, 10).map((expense: any) => (
                                <div key={expense.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="flex-1">
                                            <p className="font-medium text-slate-900 dark:text-slate-100">
                                                {expense.description || expense.category}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge variant="outline" className="text-xs">
                                                    {expense.type}
                                                </Badge>
                                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                                    {format(new Date(expense.date), 'dd/MM/yyyy', { locale: ptBR })}
                                                </span>
                                            </div>
                                        </div>
                                        <span className="font-bold text-red-600 dark:text-red-400">
                                            R$ {parseFloat(expense.value).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {(!data?.recent_expenses || data.recent_expenses.length === 0) && (
                                <div className="py-8 text-center text-slate-500 dark:text-slate-400">
                                    Nenhuma despesa registrada
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Panel Costs */}
                <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50">
                    <CardHeader>
                        <CardTitle className="text-xl font-headline font-bold">
                            Custos dos Painéis
                        </CardTitle>
                        <CardDescription>
                            Custo mensal de cada painel
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {data?.panel_costs?.map((panel: any) => (
                                <div key={panel.id} className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-medium text-slate-900 dark:text-slate-100">
                                                {panel.name}
                                            </p>
                                            <Badge variant="outline" className="text-xs mt-1">
                                                {panel.type || 'Painel'}
                                            </Badge>
                                        </div>
                                        <span className="font-bold text-amber-600 dark:text-amber-400">
                                            R$ {parseFloat(panel.monthly_cost).toFixed(2)}/mês
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {(!data?.panel_costs || data.panel_costs.length === 0) && (
                                <div className="py-8 text-center text-slate-500 dark:text-slate-400">
                                    Nenhum painel cadastrado
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Category Breakdown Table */}
            <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50">
                <CardHeader>
                    <CardTitle className="text-xl font-headline font-bold">
                        Resumo por Categoria
                    </CardTitle>
                    <CardDescription>
                        Gastos agrupados por tipo e categoria
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-700">
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Tipo</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Categoria</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Quantidade</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Total</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">% do Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data?.by_category?.map((cat: any, index: number) => (
                                    <tr key={index} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="py-3 px-4">
                                            <Badge variant="outline">
                                                {cat.type}
                                            </Badge>
                                        </td>
                                        <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                                            {cat.category || '-'}
                                        </td>
                                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                                            {cat.count}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="font-bold text-red-600 dark:text-red-400">
                                                R$ {parseFloat(cat.total).toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                                                    <div 
                                                        className="bg-red-500 h-2 rounded-full transition-all duration-300"
                                                        style={{ width: `${(parseFloat(cat.total) / totalExpenses) * 100}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-sm font-medium text-slate-600 dark:text-slate-400 min-w-[3rem]">
                                                    {((parseFloat(cat.total) / totalExpenses) * 100).toFixed(1)}%
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {(!data?.by_category || data.by_category.length === 0) && (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-slate-500 dark:text-slate-400">
                                            Nenhuma despesa encontrada
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

