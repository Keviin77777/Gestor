"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Users, TrendingUp, UserMinus, Crown } from "lucide-react";
import { CalendarDateRangePicker } from "@/components/reports/date-range-picker";
import { ReportChart } from "@/components/reports/report-chart";
import { useReports } from "@/hooks/use-reports";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ClientsReportPage() {
    const [dateRange, setDateRange] = useState({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date())
    });

    const { data, isLoading } = useReports('clients', {
        start_date: format(dateRange.from, 'yyyy-MM-dd'),
        end_date: format(dateRange.to, 'yyyy-MM-dd')
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-slate-600 dark:text-slate-400">Carregando relatório de clientes...</p>
                </div>
            </div>
        );
    }

    // Prepare data for charts
    const statusChartData = data?.by_status?.map((item: any) => ({
        name: item.status === 'active' ? 'Ativos' : 
              item.status === 'inactive' ? 'Inativos' : 
              item.status === 'suspended' ? 'Suspensos' : 'Expirados',
        value: parseInt(item.count),
        total_value: parseFloat(item.total_value || 0)
    })) || [];

    const trendChartData = data?.new_clients_trend?.map((item: any) => ({
        month: item.month,
        'Novos Clientes': parseInt(item.count)
    })) || [];

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-2">
                        <h1 className="text-4xl font-headline font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
                            Relatório de Clientes
                        </h1>
                        <p className="text-lg text-slate-600 dark:text-slate-400">
                            Análise detalhada da base de clientes
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
                <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950/50 dark:to-indigo-950/50 shadow-lg hover:shadow-xl transition-all duration-300 group">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                                Total de Clientes
                            </CardTitle>
                            <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-3 shadow-lg">
                                <Users className="h-5 w-5 text-white" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-headline font-bold text-blue-900 dark:text-blue-100">
                            {data?.by_status?.reduce((sum: number, item: any) => sum + parseInt(item.count), 0) || 0}
                        </p>
                        <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1">
                            Em todos os status
                        </p>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950/50 dark:to-emerald-950/50 shadow-lg hover:shadow-xl transition-all duration-300 group">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold text-green-700 dark:text-green-300 uppercase tracking-wide">
                                Novos no Período
                            </CardTitle>
                            <div className="rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 p-3 shadow-lg">
                                <TrendingUp className="h-5 w-5 text-white" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-headline font-bold text-green-900 dark:text-green-100">
                            {data?.new_clients_trend?.reduce((sum: number, item: any) => sum + parseInt(item.count), 0) || 0}
                        </p>
                        <p className="text-xs text-green-600/70 dark:text-green-400/70 mt-1">
                            Últimos 6 meses
                        </p>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-red-50 to-orange-100 dark:from-red-950/50 dark:to-orange-950/50 shadow-lg hover:shadow-xl transition-all duration-300 group">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold text-red-700 dark:text-red-300 uppercase tracking-wide">
                                Churn (Desistências)
                            </CardTitle>
                            <div className="rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 p-3 shadow-lg">
                                <UserMinus className="h-5 w-5 text-white" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-headline font-bold text-red-900 dark:text-red-100">
                            {data?.churned_clients || 0}
                        </p>
                        <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-1">
                            Clientes perdidos
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts */}
            <div className="grid gap-6 lg:grid-cols-2 animate-scale-in">
                <ReportChart
                    title="Distribuição por Status"
                    description="Quantidade de clientes em cada status"
                    data={statusChartData}
                    type="pie"
                    dataKeys={{ y: 'value' }}
                    height={350}
                />

                <ReportChart
                    title="Tendência de Novos Clientes"
                    description="Clientes adquiridos nos últimos 6 meses"
                    data={trendChartData}
                    type="bar"
                    dataKeys={{ x: 'month', y: 'Novos Clientes' }}
                    colors={['#10b981']}
                    height={350}
                />
            </div>

            {/* Top Clients Table */}
            <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-xl font-headline font-bold flex items-center gap-2">
                                <Crown className="h-5 w-5 text-amber-500" />
                                Top 10 Clientes por Valor
                            </CardTitle>
                            <CardDescription>
                                Clientes que geram maior receita
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-700">
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Cliente</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Status</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Valor Mensal</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Data Início</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Renovação</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data?.top_clients?.map((client: any, index: number) => (
                                    <tr key={client.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">#{index + 1}</span>
                                                <span className="font-medium text-slate-900 dark:text-slate-100">{client.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                                                {client.status === 'active' ? 'Ativo' : 'Inativo'}
                                            </Badge>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="font-bold text-green-600 dark:text-green-400">
                                                R$ {parseFloat(client.value).toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                                            {format(new Date(client.start_date), 'dd/MM/yyyy', { locale: ptBR })}
                                        </td>
                                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                                            {format(new Date(client.renewal_date), 'dd/MM/yyyy', { locale: ptBR })}
                                        </td>
                                    </tr>
                                ))}
                                {(!data?.top_clients || data.top_clients.length === 0) && (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-slate-500 dark:text-slate-400">
                                            Nenhum cliente encontrado
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

