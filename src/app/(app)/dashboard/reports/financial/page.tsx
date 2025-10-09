"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, DollarSign, Target, Zap } from "lucide-react";
import { CalendarDateRangePicker } from "@/components/reports/date-range-picker";
import { ReportChart } from "@/components/reports/report-chart";
import { useReports } from "@/hooks/use-reports";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function FinancialReportPage() {
    const [dateRange, setDateRange] = useState({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date())
    });

    const { data, isLoading } = useReports('financial', {
        start_date: format(dateRange.from, 'yyyy-MM-dd'),
        end_date: format(dateRange.to, 'yyyy-MM-dd')
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-slate-600 dark:text-slate-400">Carregando relatório financeiro...</p>
                </div>
            </div>
        );
    }

    // Prepare data for revenue trend chart
    const revenueTrendData = data?.revenue_trend?.map((item: any) => ({
        month: item.month,
        'Receita': parseFloat(item.revenue || 0)
    })) || [];

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-2">
                        <h1 className="text-4xl font-headline font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
                            Financeiro Avançado
                        </h1>
                        <p className="text-lg text-slate-600 dark:text-slate-400">
                            Métricas financeiras e KPIs estratégicos
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

            {/* KPI Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 animate-slide-up">
                <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950/50 dark:to-indigo-950/50 shadow-lg hover:shadow-xl transition-all duration-300">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                                ROI
                            </CardTitle>
                            <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-3 shadow-lg">
                                <TrendingUp className="h-5 w-5 text-white" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-headline font-bold text-blue-900 dark:text-blue-100">
                            {(data?.roi || 0).toFixed(1)}%
                        </p>
                        <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1">
                            Return on Investment
                        </p>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-950/50 dark:to-green-950/50 shadow-lg hover:shadow-xl transition-all duration-300">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
                                CAC
                            </CardTitle>
                            <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 p-3 shadow-lg">
                                <DollarSign className="h-5 w-5 text-white" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-headline font-bold text-emerald-900 dark:text-emerald-100">
                            R$ {(data?.cac || 0).toFixed(2)}
                        </p>
                        <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1">
                            Custo de Aquisição de Cliente
                        </p>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-950/50 dark:to-violet-950/50 shadow-lg hover:shadow-xl transition-all duration-300">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide">
                                LTV
                            </CardTitle>
                            <div className="rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 p-3 shadow-lg">
                                <Target className="h-5 w-5 text-white" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-headline font-bold text-purple-900 dark:text-purple-100">
                            R$ {(data?.ltv || 0).toFixed(2)}
                        </p>
                        <p className="text-xs text-purple-600/70 dark:text-purple-400/70 mt-1">
                            Lifetime Value (estimado)
                        </p>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-950/50 dark:to-orange-950/50 shadow-lg hover:shadow-xl transition-all duration-300">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide">
                                LTV/CAC
                            </CardTitle>
                            <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-3 shadow-lg">
                                <Zap className="h-5 w-5 text-white" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-headline font-bold text-amber-900 dark:text-amber-100">
                            {(data?.ltv_cac_ratio || 0).toFixed(1)}x
                        </p>
                        <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-1">
                            Relação LTV/CAC
                        </p>
                        {data?.ltv_cac_ratio >= 3 ? (
                            <Badge className="mt-2 bg-green-100 text-green-700 border-green-200">
                                Saudável (≥3x)
                            </Badge>
                        ) : (
                            <Badge className="mt-2 bg-amber-100 text-amber-700 border-amber-200">
                                Atenção (&lt;3x)
                            </Badge>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Revenue Trend Chart */}
            <div className="animate-scale-in">
                <ReportChart
                    title="Evolução da Receita (12 meses)"
                    description="Tendência de receita mensal nos últimos 12 meses"
                    data={revenueTrendData}
                    type="line"
                    dataKeys={{ x: 'month', y: 'Receita' }}
                    colors={['#3b82f6']}
                    height={400}
                />
            </div>

            {/* KPI Explanations */}
            <div className="grid gap-6 md:grid-cols-2 animate-scale-in">
                <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50">
                    <CardHeader>
                        <CardTitle className="text-lg font-headline font-bold">
                            Entendendo os KPIs
                        </CardTitle>
                        <CardDescription>
                            Métricas essenciais para o sucesso do negócio
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">ROI (Return on Investment)</h4>
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                                Mede o retorno sobre o investimento. Calculado como: ((Receita - Despesas) / Despesas) × 100
                            </p>
                        </div>

                        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                            <h4 className="font-semibold text-emerald-900 dark:text-emerald-100 mb-2">CAC (Customer Acquisition Cost)</h4>
                            <p className="text-sm text-emerald-700 dark:text-emerald-300">
                                Custo médio para adquirir um novo cliente. Inclui marketing e vendas.
                            </p>
                        </div>

                        <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                            <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">LTV (Lifetime Value)</h4>
                            <p className="text-sm text-purple-700 dark:text-purple-300">
                                Valor total que um cliente gera durante seu relacionamento com a empresa. Estimado em 12 meses.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50">
                    <CardHeader>
                        <CardTitle className="text-lg font-headline font-bold">
                            Análise da Relação LTV/CAC
                        </CardTitle>
                        <CardDescription>
                            Indicador de saúde do negócio
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border-l-4 border-green-500">
                            <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">✅ Saudável (≥ 3x)</h4>
                            <p className="text-sm text-green-700 dark:text-green-300">
                                O valor que um cliente gera é pelo menos 3 vezes maior que o custo para adquiri-lo. Negócio sustentável!
                            </p>
                        </div>

                        <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border-l-4 border-amber-500">
                            <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">⚠️ Atenção (1-3x)</h4>
                            <p className="text-sm text-amber-700 dark:text-amber-300">
                                A relação está abaixo do ideal. Considere reduzir custos de aquisição ou aumentar o ticket médio.
                            </p>
                        </div>

                        <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border-l-4 border-red-500">
                            <h4 className="font-semibold text-red-900 dark:text-red-100 mb-2">🚨 Crítico (&lt; 1x)</h4>
                            <p className="text-sm text-red-700 dark:text-red-300">
                                Você está gastando mais para adquirir clientes do que eles geram. Ação imediata necessária!
                            </p>
                        </div>

                        <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                            <p className="text-sm text-slate-700 dark:text-slate-300">
                                <strong>Seu índice atual:</strong> <span className="text-2xl font-bold">{(data?.ltv_cac_ratio || 0).toFixed(1)}x</span>
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

