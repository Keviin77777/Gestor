"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, TrendingUp, TrendingDown, Calendar, ChevronDown } from "lucide-react";
import { format, subDays, parseISO, startOfDay, isSameDay, startOfMonth, endOfMonth, getDaysInMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Client } from "@/lib/definitions";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useClients } from '@/hooks/use-clients';

interface DailyClientsChartProps {
  clients?: Client[];
}

export function DailyClientsChart({ clients }: DailyClientsChartProps) {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  // Generate month options
  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  // Generate year options (last 3 years + current + next year)
  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i);
  const stats = useMemo(() => {
    if (!clients) return { chartData: [], total: 0, today: 0, average: 0, trend: 0, bestDay: { count: 0, date: '' } };

    const today = new Date();
    const selectedDate = new Date(selectedYear, selectedMonth, 1);
    const daysInSelectedMonth = getDaysInMonth(selectedDate);
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);

    // Generate days for selected month
    const monthDays = Array.from({ length: daysInSelectedMonth }, (_, i) => {
      const date = new Date(selectedYear, selectedMonth, i + 1);
      return startOfDay(date);
    });

    // Count clients per day
    const dailyCounts = monthDays.map(date => {
      const count = clients.filter(client => {
        const clientDate = parseISO(client.start_date);
        return isSameDay(clientDate, date);
      }).length;

      return {
        date: format(date, "dd/MM"),
        fullDate: format(date, "dd 'de' MMMM", { locale: ptBR }),
        count,
      };
    });

    // Find best day
    const bestDay = dailyCounts.reduce((best, current) => {
      return current.count > best.count ? current : best;
    }, { count: 0, date: '', fullDate: '' });

    // Calculate stats for selected month
    const monthClients = clients.filter(client => {
      const clientDate = parseISO(client.start_date);
      return clientDate >= monthStart && clientDate <= monthEnd;
    });

    const total = monthClients.length;
    const todayCount = clients.filter(client => 
      isSameDay(parseISO(client.start_date), today)
    ).length;
    
    const last7Days = dailyCounts.slice(-7);
    const previous7Days = dailyCounts.slice(-14, -7);
    
    const last7Average = last7Days.reduce((sum, day) => sum + day.count, 0) / 7;
    const previous7Average = previous7Days.length > 0 
      ? previous7Days.reduce((sum, day) => sum + day.count, 0) / 7 
      : 0;
    
    const trend = previous7Average > 0 
      ? ((last7Average - previous7Average) / previous7Average) * 100 
      : 0;

    return {
      chartData: dailyCounts,
      total,
      today: todayCount,
      average: last7Average,
      trend,
      bestDay: { count: bestDay.count, date: bestDay.fullDate },
    };
  }, [clients, selectedMonth, selectedYear]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-sm border border-slate-700 rounded-lg p-3 shadow-xl">
          <p className="text-slate-200 font-medium text-sm mb-1">
            {payload[0].payload.fullDate}
          </p>
          <p className="text-emerald-400 font-bold text-lg">
            {payload[0].value} {payload[0].value === 1 ? 'cliente' : 'clientes'}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border-0 shadow-xl bg-gradient-to-br from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 hover:shadow-2xl transition-all duration-300 overflow-hidden">
      {/* Header */}
      <CardHeader className="pb-4 space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-500/20 backdrop-blur-sm">
                <UserPlus className="h-5 w-5 text-emerald-400" />
              </div>
              <CardTitle className="text-xl font-headline font-bold text-slate-900 dark:text-white">
                Clientes Novos Por Dia
              </CardTitle>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Cadastros diários do período selecionado
            </p>
          </div>
          <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="bg-emerald-50 dark:bg-slate-800/50 border-emerald-200 dark:border-slate-700 text-emerald-700 dark:text-slate-300 hover:bg-emerald-100 dark:hover:bg-slate-700/50 hover:text-emerald-900 dark:hover:text-white backdrop-blur-sm shadow-sm"
              >
                <Calendar className="h-3 w-3 mr-2" />
                {months[selectedMonth]} {selectedYear}
                <ChevronDown className="h-3 w-3 ml-2" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700" align="end">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Mês</label>
                  <Select
                    value={selectedMonth.toString()}
                    onValueChange={(value) => setSelectedMonth(parseInt(value))}
                  >
                    <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      {months.map((month, index) => (
                        <SelectItem key={index} value={index.toString()} className="text-slate-900 dark:text-slate-200">
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Ano</label>
                  <Select
                    value={selectedYear.toString()}
                    onValueChange={(value) => setSelectedYear(parseInt(value))}
                  >
                    <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      {years.map((year) => (
                        <SelectItem key={year} value={year.toString()} className="text-slate-900 dark:text-slate-200">
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => {
                    setSelectedMonth(currentDate.getMonth());
                    setSelectedYear(currentDate.getFullYear());
                    setIsPopoverOpen(false);
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Mês Atual
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-xl p-3 backdrop-blur-sm">
            <p className="text-xs text-emerald-600 dark:text-emerald-400/80 font-medium mb-1">Total</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.total}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">clientes</p>
          </div>
          
          <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-xl p-3 backdrop-blur-sm">
            <p className="text-xs text-blue-600 dark:text-blue-400/80 font-medium mb-1">Média/Dia</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.average.toFixed(1)}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">últimos 7 dias</p>
          </div>
          
          <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-xl p-3 backdrop-blur-sm">
            <p className="text-xs text-purple-600 dark:text-purple-400/80 font-medium mb-1">Hoje</p>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.today}</p>
            <div className="flex items-center gap-1 mt-0.5">
              {stats.trend >= 0 ? (
                <TrendingUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600 dark:text-red-400" />
              )}
              <span className={`text-xs font-medium ${stats.trend >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {Math.abs(stats.trend).toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-500/10 to-orange-600/5 border border-yellow-500/20 rounded-xl p-3 backdrop-blur-sm">
            <p className="text-xs text-yellow-600 dark:text-yellow-400/80 font-medium mb-1">Melhor Dia</p>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.bestDay.count}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{stats.bestDay.date || 'N/A'}</p>
          </div>
        </div>
      </CardHeader>

      {/* Chart */}
      <CardContent className="pb-6">
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <defs>
                <linearGradient id="colorClients" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
              <XAxis 
                dataKey="date" 
                stroke="#64748b" 
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={11}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="count" 
                stroke="#10b981" 
                strokeWidth={2}
                fill="url(#colorClients)"
                animationDuration={1000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>

      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -z-10" />
    </Card>
  );
}
