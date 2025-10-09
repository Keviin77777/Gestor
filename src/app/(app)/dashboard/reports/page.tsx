"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, TrendingUp, TrendingDown, DollarSign, Users, Calendar, Target } from "lucide-react";
import { CalendarDateRangePicker } from "@/components/reports/date-range-picker";
import { ReportChart } from "@/components/reports/report-chart";
import { useReports } from "@/hooks/use-reports";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ReportsOverviewPage() {
    const [dateRange, setDateRange] = useState({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date())
    });

    const { data, isLoading } = useReports('overview', {
        start_date: format(dateRange.from, 'yyyy-MM-dd'),
        end_date: format(dateRange.to, 'yyyy-MM-dd')
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-slate-600 dark:text-slate-400">Carregando relatório...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-2">
                        <h1 className="text-4xl font-headline font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
                            Visão Geral - Relatórios
                        </h1>
                        <p className="text-lg text-slate-600 dark:text-slate-400">
                            Análise completa do desempenho financeiro
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
                                    Receita do Período
                                </CardTitle>
                                <CardDescription className="text-xs text-blue-600/70 dark:text-blue-400/70">
                                    {data?.actual_revenue > 0 ? 'Faturas pagas' : 'Receita potencial'}
                                </CardDescription>
                            </div>
                            <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-3 shadow-lg group-hover:scale-110 transition-transform duration-300">
                                <DollarSign className="h-5 w-5 text-white" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-headline font-bold text-blue-900 dark:text-blue-100">
                            R$ {(data?.monthly_revenue || 0).toFixed(2)}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-200">
                                {data?.active_clients || 0} clientes ativos
                            </Badge>
                            {data?.actual_revenue > 0 && (
                                <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-200">
                                    Receita real
                                </Badge>
                            )}
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
                                    Registradas + Painéis
                                </CardDescription>
                            </div>
                            <div className="rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 p-3 shadow-lg group-hover:scale-110 transition-transform duration-300">
                                <TrendingDown className="h-5 w-5 text-white" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-headline font-bold text-red-900 dark:text-red-100">
                            R$ {(data?.total_costs || 0).toFixed(2)}
                        </p>
                        <div className="space-y-1 mt-2">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-red-600/70 dark:text-red-400/70">Registradas:</span>
                                <span className="font-medium text-red-800 dark:text-red-200">R$ {(data?.total_expenses || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-red-600/70 dark:text-red-400/70">Painéis:</span>
                                <span className="font-medium text-red-800 dark:text-red-200">R$ {(data?.panel_costs || 0).toFixed(2)}</span>
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
                        <p className={`text-3xl font-headline font-bold ${(data?.net_profit || 0) >= 0 ? 'text-emerald-900 dark:text-emerald-100' : 'text-red-900 dark:text-red-100'}`}>
                            R$ {(data?.net_profit || 0).toFixed(2)}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                            <Badge 
                                variant="outline" 
                                className={`text-xs ${
                                    (data?.profit_margin || 0) >= 0 
                                        ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                                        : 'bg-red-100 text-red-700 border-red-200'
                                }`}
                            >
                                Margem: {(data?.profit_margin || 0).toFixed(1)}%
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
                            R$ {(data?.average_ticket || 0).toFixed(2)}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700 border-purple-200">
                                {data?.new_clients || 0} novos no período
                            </Badge>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Additional Metrics */}
            <div className="grid gap-6 md:grid-cols-3 animate-scale-in">
                <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg font-headline font-bold flex items-center gap-2">
                            <Target className="h-5 w-5 text-blue-600" />
                            Resumo de Clientes
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                            <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Clientes Ativos</span>
                            <span className="text-lg font-bold text-blue-900 dark:text-blue-100">
                                {data?.active_clients || 0}
                            </span>
                        </div>
                        
                        <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-950/30 rounded-lg">
                            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">Clientes Inativos</span>
                            <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                                {data?.inactive_clients || 0}
                            </span>
                        </div>
                        
                        <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                            <span className="text-sm font-medium text-green-800 dark:text-green-200">Novos no Período</span>
                            <span className="text-lg font-bold text-green-900 dark:text-green-100">
                                {data?.new_clients || 0}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="md:col-span-2 border-0 shadow-xl bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg font-headline font-bold">
                            Resumo Financeiro
                        </CardTitle>
                        <CardDescription>
                            Detalhamento completo do período selecionado
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <p className="text-sm text-slate-600 dark:text-slate-400">Receita Bruta</p>
                                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                    R$ {(data?.monthly_revenue || 0).toFixed(2)}
                                </p>
                            </div>
                            
                            <div className="space-y-2">
                                <p className="text-sm text-slate-600 dark:text-slate-400">Despesas Totais</p>
                                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                                    R$ {(data?.total_costs || 0).toFixed(2)}
                                </p>
                            </div>
                            
                            <div className="space-y-2">
                                <p className="text-sm text-slate-600 dark:text-slate-400">Lucro Líquido</p>
                                <p className={`text-2xl font-bold ${(data?.net_profit || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                    R$ {(data?.net_profit || 0).toFixed(2)}
                                </p>
                            </div>
                            
                            <div className="space-y-2">
                                <p className="text-sm text-slate-600 dark:text-slate-400">Margem de Lucro</p>
                                <p className={`text-2xl font-bold ${(data?.profit_margin || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {(data?.profit_margin || 0).toFixed(1)}%
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
