"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { CalendarDateRangePicker } from "@/components/reports/date-range-picker";
import { useReports } from "@/hooks/use-reports";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ComparativeReportPage() {
    const [dateRange, setDateRange] = useState({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date())
    });

    const { data, isLoading } = useReports('comparative', {
        start_date: format(dateRange.from, 'yyyy-MM-dd'),
        end_date: format(dateRange.to, 'yyyy-MM-dd')
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-slate-600 dark:text-slate-400">Carregando relatório comparativo...</p>
                </div>
            </div>
        );
    }

    const renderGrowthIndicator = (value: number) => {
        if (value > 0) {
            return (
                <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                    <ArrowUpRight className="h-4 w-4" />
                    <span className="font-bold">+{value.toFixed(1)}%</span>
                </div>
            );
        } else if (value < 0) {
            return (
                <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                    <ArrowDownRight className="h-4 w-4" />
                    <span className="font-bold">{value.toFixed(1)}%</span>
                </div>
            );
        } else {
            return (
                <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                    <Minus className="h-4 w-4" />
                    <span className="font-bold">0.0%</span>
                </div>
            );
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-2">
                        <h1 className="text-4xl font-headline font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
                            Relatório Comparativo
                        </h1>
                        <p className="text-lg text-slate-600 dark:text-slate-400">
                            Compare o desempenho entre diferentes períodos
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

            {/* Period Info */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50">
                    <CardHeader>
                        <CardTitle className="text-lg font-headline font-bold text-blue-900 dark:text-blue-100">
                            Período Atual
                        </CardTitle>
                        <CardDescription className="text-blue-700 dark:text-blue-300">
                            {format(new Date(data?.current_period?.start || dateRange.from), 'dd/MM/yyyy', { locale: ptBR })} - {format(new Date(data?.current_period?.end || dateRange.to), 'dd/MM/yyyy', { locale: ptBR })}
                        </CardDescription>
                    </CardHeader>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-950/50 dark:to-gray-950/50">
                    <CardHeader>
                        <CardTitle className="text-lg font-headline font-bold text-slate-900 dark:text-slate-100">
                            Período Anterior
                        </CardTitle>
                        <CardDescription className="text-slate-700 dark:text-slate-300">
                            {format(new Date(data?.previous_period?.start || dateRange.from), 'dd/MM/yyyy', { locale: ptBR })} - {format(new Date(data?.previous_period?.end || dateRange.to), 'dd/MM/yyyy', { locale: ptBR })}
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>

            {/* Comparison Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 animate-slide-up">
                {/* Revenue Comparison */}
                <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                            Receita
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Período Atual</p>
                            <p className="text-3xl font-headline font-bold text-blue-600 dark:text-blue-400">
                                R$ {(data?.current_period?.metrics?.revenue || 0).toFixed(2)}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Período Anterior</p>
                            <p className="text-xl font-semibold text-slate-600 dark:text-slate-400">
                                R$ {(data?.previous_period?.metrics?.revenue || 0).toFixed(2)}
                            </p>
                        </div>
                        <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Variação</p>
                            {renderGrowthIndicator(data?.comparison?.revenue || 0)}
                        </div>
                    </CardContent>
                </Card>

                {/* Expenses Comparison */}
                <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                            Despesas
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Período Atual</p>
                            <p className="text-3xl font-headline font-bold text-red-600 dark:text-red-400">
                                R$ {(data?.current_period?.metrics?.expenses || 0).toFixed(2)}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Período Anterior</p>
                            <p className="text-xl font-semibold text-slate-600 dark:text-slate-400">
                                R$ {(data?.previous_period?.metrics?.expenses || 0).toFixed(2)}
                            </p>
                        </div>
                        <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Variação</p>
                            {renderGrowthIndicator(data?.comparison?.expenses || 0)}
                        </div>
                    </CardContent>
                </Card>

                {/* Profit Comparison */}
                <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                            Lucro Líquido
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Período Atual</p>
                            <p className="text-3xl font-headline font-bold text-emerald-600 dark:text-emerald-400">
                                R$ {(data?.current_period?.metrics?.profit || 0).toFixed(2)}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Período Anterior</p>
                            <p className="text-xl font-semibold text-slate-600 dark:text-slate-400">
                                R$ {(data?.previous_period?.metrics?.profit || 0).toFixed(2)}
                            </p>
                        </div>
                        <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Variação</p>
                            {renderGrowthIndicator(data?.comparison?.profit || 0)}
                        </div>
                    </CardContent>
                </Card>

                {/* Clients Comparison */}
                <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                            Total de Clientes
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Período Atual</p>
                            <p className="text-3xl font-headline font-bold text-purple-600 dark:text-purple-400">
                                {data?.current_period?.metrics?.clients || 0}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Período Anterior</p>
                            <p className="text-xl font-semibold text-slate-600 dark:text-slate-400">
                                {data?.previous_period?.metrics?.clients || 0}
                            </p>
                        </div>
                        <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Variação</p>
                            {renderGrowthIndicator(data?.comparison?.clients || 0)}
                        </div>
                    </CardContent>
                </Card>

                {/* New Clients Comparison */}
                <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                            Novos Clientes
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Período Atual</p>
                            <p className="text-3xl font-headline font-bold text-indigo-600 dark:text-indigo-400">
                                {data?.current_period?.metrics?.new_clients || 0}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Período Anterior</p>
                            <p className="text-xl font-semibold text-slate-600 dark:text-slate-400">
                                {data?.previous_period?.metrics?.new_clients || 0}
                            </p>
                        </div>
                        <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Variação</p>
                            {renderGrowthIndicator(data?.comparison?.new_clients || 0)}
                        </div>
                    </CardContent>
                </Card>

                {/* Overall Performance */}
                <Card className="border-0 shadow-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Performance Geral
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-amber-700 dark:text-amber-300">Receita</span>
                                <Badge variant={data?.comparison?.revenue >= 0 ? 'default' : 'destructive'}>
                                    {data?.comparison?.revenue >= 0 ? '+' : ''}{(data?.comparison?.revenue || 0).toFixed(1)}%
                                </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-amber-700 dark:text-amber-300">Lucro</span>
                                <Badge variant={data?.comparison?.profit >= 0 ? 'default' : 'destructive'}>
                                    {data?.comparison?.profit >= 0 ? '+' : ''}{(data?.comparison?.profit || 0).toFixed(1)}%
                                </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-amber-700 dark:text-amber-300">Clientes</span>
                                <Badge variant={data?.comparison?.clients >= 0 ? 'default' : 'destructive'}>
                                    {data?.comparison?.clients >= 0 ? '+' : ''}{(data?.comparison?.clients || 0).toFixed(1)}%
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Insights */}
            <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50 animate-scale-in">
                <CardHeader>
                    <CardTitle className="text-xl font-headline font-bold">
                        Análise e Insights
                    </CardTitle>
                    <CardDescription>
                        Interpretação automática dos resultados comparativos
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {/* Revenue Insight */}
                        {data?.comparison?.revenue !== undefined && (
                            <div className={`p-4 rounded-lg ${
                                data.comparison.revenue > 10 ? 'bg-green-50 dark:bg-green-950/30 border-l-4 border-green-500' :
                                data.comparison.revenue > 0 ? 'bg-blue-50 dark:bg-blue-950/30 border-l-4 border-blue-500' :
                                data.comparison.revenue === 0 ? 'bg-slate-50 dark:bg-slate-950/30 border-l-4 border-slate-500' :
                                'bg-red-50 dark:bg-red-950/30 border-l-4 border-red-500'
                            }`}>
                                <h4 className="font-semibold mb-2">💰 Receita</h4>
                                <p className="text-sm">
                                    {data.comparison.revenue > 10 ? 
                                        `Excelente! Sua receita cresceu ${data.comparison.revenue.toFixed(1)}% em relação ao período anterior. Continue com as estratégias atuais!` :
                                    data.comparison.revenue > 0 ?
                                        `Sua receita aumentou ${data.comparison.revenue.toFixed(1)}%. Há espaço para otimização.` :
                                    data.comparison.revenue === 0 ?
                                        `Sua receita se manteve estável. Considere estratégias de crescimento.` :
                                        `Atenção: Sua receita caiu ${Math.abs(data.comparison.revenue).toFixed(1)}%. Revise suas estratégias comerciais.`
                                    }
                                </p>
                            </div>
                        )}

                        {/* Profit Insight */}
                        {data?.comparison?.profit !== undefined && (
                            <div className={`p-4 rounded-lg ${
                                data.comparison.profit > 10 ? 'bg-green-50 dark:bg-green-950/30 border-l-4 border-green-500' :
                                data.comparison.profit > 0 ? 'bg-blue-50 dark:bg-blue-950/30 border-l-4 border-blue-500' :
                                data.comparison.profit === 0 ? 'bg-slate-50 dark:bg-slate-950/30 border-l-4 border-slate-500' :
                                'bg-red-50 dark:bg-red-950/30 border-l-4 border-red-500'
                            }`}>
                                <h4 className="font-semibold mb-2">📈 Lucro Líquido</h4>
                                <p className="text-sm">
                                    {data.comparison.profit > 10 ?
                                        `Ótimo trabalho! Seu lucro aumentou ${data.comparison.profit.toFixed(1)}%. A eficiência operacional está excelente!` :
                                    data.comparison.profit > 0 ?
                                        `Lucro cresceu ${data.comparison.profit.toFixed(1)}%. Continue otimizando custos.` :
                                    data.comparison.profit === 0 ?
                                        `Lucro estável. Avalie oportunidades de reduzir custos ou aumentar receita.` :
                                        `Alerta: Lucro reduziu ${Math.abs(data.comparison.profit).toFixed(1)}%. Revise despesas urgentemente.`
                                    }
                                </p>
                            </div>
                        )}

                        {/* Clients Insight */}
                        {data?.comparison?.new_clients !== undefined && (
                            <div className={`p-4 rounded-lg ${
                                data.comparison.new_clients > 0 ? 'bg-green-50 dark:bg-green-950/30 border-l-4 border-green-500' :
                                data.comparison.new_clients === 0 ? 'bg-amber-50 dark:bg-amber-950/30 border-l-4 border-amber-500' :
                                'bg-red-50 dark:bg-red-950/30 border-l-4 border-red-500'
                            }`}>
                                <h4 className="font-semibold mb-2">👥 Aquisição de Clientes</h4>
                                <p className="text-sm">
                                    {data.comparison.new_clients > 0 ?
                                        `Você adquiriu ${data.comparison.new_clients.toFixed(0)}% mais clientes que o período anterior!` :
                                    data.comparison.new_clients === 0 ?
                                        `A aquisição de clientes está estável. Considere ampliar suas estratégias de marketing.` :
                                        `A aquisição caiu ${Math.abs(data.comparison.new_clients).toFixed(0)}%. Revise suas campanhas de marketing.`
                                    }
                                </p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

