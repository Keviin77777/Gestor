"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, AlertTriangle, DollarSign, Clock } from "lucide-react";
import { ReportChart } from "@/components/reports/report-chart";
import { useReports } from "@/hooks/use-reports";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function DefaultersReportPage() {
    const { data, isLoading } = useReports('defaulters', {});

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-slate-600 dark:text-slate-400">Carregando relatório de inadimplência...</p>
                </div>
            </div>
        );
    }

    // Prepare chart data for overdue groups
    const overdueGroupsData = Object.entries(data?.overdue_groups || {}).map(([key, value]: [string, any]) => ({
        name: `${key} dias`,
        'Quantidade': value.count,
        'Valor': value.value
    }));

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-2">
                        <h1 className="text-4xl font-headline font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
                            Relatório de Inadimplência
                        </h1>
                        <p className="text-lg text-slate-600 dark:text-slate-400">
                            Clientes com pagamentos em atraso
                        </p>
                    </div>
                    <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
                        <Download className="mr-2 h-4 w-4" />
                        Exportar
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-6 md:grid-cols-3 animate-slide-up">
                <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-red-50 to-orange-100 dark:from-red-950/50 dark:to-orange-950/50 shadow-lg hover:shadow-xl transition-all duration-300">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold text-red-700 dark:text-red-300 uppercase tracking-wide">
                                Total Inadimplentes
                            </CardTitle>
                            <div className="rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 p-3 shadow-lg">
                                <AlertTriangle className="h-5 w-5 text-white" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-headline font-bold text-red-900 dark:text-red-100">
                            {data?.total_defaulters || 0}
                        </p>
                        <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-1">
                            Clientes em atraso
                        </p>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-amber-50 to-yellow-100 dark:from-amber-950/50 dark:to-yellow-950/50 shadow-lg hover:shadow-xl transition-all duration-300">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide">
                                Valor em Atraso
                            </CardTitle>
                            <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 p-3 shadow-lg">
                                <DollarSign className="h-5 w-5 text-white" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-headline font-bold text-amber-900 dark:text-amber-100">
                            R$ {(data?.total_overdue_value || 0).toFixed(2)}
                        </p>
                        <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-1">
                            Receita a recuperar
                        </p>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-950/50 dark:to-gray-950/50 shadow-lg hover:shadow-xl transition-all duration-300">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                                Ticket Médio
                            </CardTitle>
                            <div className="rounded-2xl bg-gradient-to-br from-slate-500 to-gray-600 p-3 shadow-lg">
                                <Clock className="h-5 w-5 text-white" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-headline font-bold text-slate-900 dark:text-slate-100">
                            R$ {((data?.total_overdue_value || 0) / (data?.total_defaulters || 1)).toFixed(2)}
                        </p>
                        <p className="text-xs text-slate-600/70 dark:text-slate-400/70 mt-1">
                            Por cliente inadimplente
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Chart */}
            <div className="animate-scale-in">
                <ReportChart
                    title="Distribuição por Período de Atraso"
                    description="Quantidade e valor de clientes por tempo de inadimplência"
                    data={overdueGroupsData}
                    type="bar"
                    dataKeys={{ x: 'name', y: ['Quantidade', 'Valor'] }}
                    colors={['#ef4444', '#f59e0b']}
                    height={350}
                />
            </div>

            {/* Defaulters Table */}
            <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50">
                <CardHeader>
                    <CardTitle className="text-xl font-headline font-bold">
                        Lista de Clientes Inadimplentes
                    </CardTitle>
                    <CardDescription>
                        Clientes com renovação vencida ordenados por prioridade
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-700">
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Cliente</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Contato</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Valor</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Vencimento</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Dias Atraso</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data?.defaulters?.map((client: any) => (
                                    <tr key={client.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                                            {client.name}
                                        </td>
                                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400 text-sm">
                                            <div>{client.phone || '-'}</div>
                                            <div className="text-xs">{client.email || '-'}</div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="font-bold text-red-600 dark:text-red-400">
                                                R$ {parseFloat(client.value).toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                                            {format(new Date(client.renewal_date), 'dd/MM/yyyy', { locale: ptBR })}
                                        </td>
                                        <td className="py-3 px-4">
                                            <Badge 
                                                variant="outline"
                                                className={`
                                                    ${parseInt(client.days_overdue) <= 7 ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : ''}
                                                    ${parseInt(client.days_overdue) > 7 && parseInt(client.days_overdue) <= 15 ? 'bg-orange-100 text-orange-800 border-orange-200' : ''}
                                                    ${parseInt(client.days_overdue) > 15 ? 'bg-red-100 text-red-800 border-red-200' : ''}
                                                `}
                                            >
                                                {client.days_overdue} dias
                                            </Badge>
                                        </td>
                                        <td className="py-3 px-4">
                                            <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                                                {client.status}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))}
                                {(!data?.defaulters || data.defaulters.length === 0) && (
                                    <tr>
                                        <td colSpan={6} className="py-8 text-center text-slate-500 dark:text-slate-400">
                                            🎉 Nenhum cliente inadimplente! Excelente trabalho!
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

