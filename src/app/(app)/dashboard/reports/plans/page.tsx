"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Package, TrendingUp, DollarSign } from "lucide-react";
import { CalendarDateRangePicker } from "@/components/reports/date-range-picker";
import { ReportChart } from "@/components/reports/report-chart";
import { useReports } from "@/hooks/use-reports";
import { format, startOfMonth, endOfMonth } from "date-fns";

export default function PlansReportPage() {
    const [dateRange, setDateRange] = useState({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date())
    });

    const { data, isLoading } = useReports('plans', {
        start_date: format(dateRange.from, 'yyyy-MM-dd'),
        end_date: format(dateRange.to, 'yyyy-MM-dd')
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-slate-600 dark:text-slate-400">Carregando relatório de planos...</p>
                </div>
            </div>
        );
    }

    // Prepare chart data
    const distributionData = data?.plan_distribution?.map((plan: any) => ({
        name: plan.plan_name,
        'Clientes': parseInt(plan.client_count),
        'Receita': parseFloat(plan.total_revenue || 0)
    })) || [];

    const profitabilityData = data?.plan_distribution?.map((plan: any) => ({
        name: plan.plan_name,
        'Receita': parseFloat(plan.total_revenue || 0),
        'Custo': parseFloat(plan.operational_cost || 0),
        'Lucro': parseFloat(plan.net_profit || 0)
    })) || [];

    const totalRevenue = data?.plan_distribution?.reduce((sum: number, plan: any) => sum + parseFloat(plan.total_revenue || 0), 0) || 0;
    const totalClients = data?.plan_distribution?.reduce((sum: number, plan: any) => sum + parseInt(plan.client_count), 0) || 0;

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-2">
                        <h1 className="text-4xl font-headline font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
                            Relatório de Planos
                        </h1>
                        <p className="text-lg text-slate-600 dark:text-slate-400">
                            Análise de rentabilidade por plano
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
                <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950/50 dark:to-indigo-950/50 shadow-lg hover:shadow-xl transition-all duration-300">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                                Total de Planos
                            </CardTitle>
                            <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-3 shadow-lg">
                                <Package className="h-5 w-5 text-white" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-headline font-bold text-blue-900 dark:text-blue-100">
                            {data?.plan_distribution?.length || 0}
                        </p>
                        <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1">
                            Planos cadastrados
                        </p>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-950/50 dark:to-green-950/50 shadow-lg hover:shadow-xl transition-all duration-300">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
                                Receita Total
                            </CardTitle>
                            <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 p-3 shadow-lg">
                                <DollarSign className="h-5 w-5 text-white" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-headline font-bold text-emerald-900 dark:text-emerald-100">
                            R$ {totalRevenue.toFixed(2)}
                        </p>
                        <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1">
                            De todos os planos
                        </p>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-950/50 dark:to-violet-950/50 shadow-lg hover:shadow-xl transition-all duration-300">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide">
                                Clientes Totais
                            </CardTitle>
                            <div className="rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 p-3 shadow-lg">
                                <TrendingUp className="h-5 w-5 text-white" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-headline font-bold text-purple-900 dark:text-purple-100">
                            {totalClients}
                        </p>
                        <p className="text-xs text-purple-600/70 dark:text-purple-400/70 mt-1">
                            Distribuídos nos planos
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts */}
            <div className="grid gap-6 lg:grid-cols-2 animate-scale-in">
                <ReportChart
                    title="Distribuição de Clientes por Plano"
                    description="Quantidade de clientes em cada plano"
                    data={distributionData}
                    type="pie"
                    dataKeys={{ y: 'Clientes' }}
                    height={350}
                />

                <ReportChart
                    title="Rentabilidade por Plano"
                    description="Receita, custo e lucro de cada plano"
                    data={profitabilityData}
                    type="bar"
                    dataKeys={{ x: 'name', y: ['Receita', 'Custo', 'Lucro'] }}
                    colors={['#10b981', '#ef4444', '#3b82f6']}
                    height={350}
                />
            </div>

            {/* Plans Table */}
            <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50">
                <CardHeader>
                    <CardTitle className="text-xl font-headline font-bold">
                        Análise Detalhada por Plano
                    </CardTitle>
                    <CardDescription>
                        Métricas completas de cada plano
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-700">
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Plano</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Clientes</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Valor Plano</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Receita Total</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Custo Operacional</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Lucro Líquido</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Margem</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data?.plan_distribution?.map((plan: any) => (
                                    <tr key={plan.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                                            {plan.plan_name}
                                        </td>
                                        <td className="py-3 px-4">
                                            <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">
                                                {plan.client_count}
                                            </Badge>
                                        </td>
                                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                                            R$ {parseFloat(plan.plan_value).toFixed(2)}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                                R$ {parseFloat(plan.total_revenue || 0).toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-red-600 dark:text-red-400">
                                            R$ {parseFloat(plan.operational_cost || 0).toFixed(2)}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`font-bold ${parseFloat(plan.net_profit) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                R$ {parseFloat(plan.net_profit || 0).toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <Badge 
                                                variant="outline"
                                                className={`${
                                                    parseFloat(plan.profit_margin) >= 50 ? 'bg-green-100 text-green-700 border-green-200' :
                                                    parseFloat(plan.profit_margin) >= 20 ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                                    parseFloat(plan.profit_margin) >= 0 ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                                    'bg-red-100 text-red-700 border-red-200'
                                                }`}
                                            >
                                                {parseFloat(plan.profit_margin || 0).toFixed(1)}%
                                            </Badge>
                                        </td>
                                    </tr>
                                ))}
                                {(!data?.plan_distribution || data.plan_distribution.length === 0) && (
                                    <tr>
                                        <td colSpan={7} className="py-8 text-center text-slate-500 dark:text-slate-400">
                                            Nenhum plano encontrado
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

