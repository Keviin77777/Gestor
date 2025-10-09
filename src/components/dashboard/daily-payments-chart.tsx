"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, TrendingUp, TrendingDown, Calendar, CheckCircle, ChevronDown } from "lucide-react";
import { format, subDays, parseISO, startOfDay, isSameDay, startOfMonth, endOfMonth, getDaysInMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Invoice } from "@/lib/definitions";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface DailyPaymentsChartProps {
  invoices?: Invoice[];
}

export function DailyPaymentsChart({ invoices }: DailyPaymentsChartProps) {
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
    if (!invoices) return { chartData: [], totalValue: 0, todayValue: 0, todayCount: 0, average: 0, trend: 0, bestDay: { value: 0, date: '' } };

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

    // Count payments per day (only paid invoices)
    const dailyPayments = monthDays.map(date => {
      const paidInvoices = invoices.filter(invoice => {
        if (invoice.status !== 'paid' || !invoice.paymentDate) return false;
        const paymentDate = parseISO(invoice.paymentDate);
        return isSameDay(paymentDate, date);
      });

      const totalValue = paidInvoices.reduce((sum, inv) => sum + inv.finalValue, 0);
      const count = paidInvoices.length;

      return {
        date: format(date, "dd/MM"),
        fullDate: format(date, "dd 'de' MMMM", { locale: ptBR }),
        value: totalValue,
        count,
      };
    });

    // Find best day
    const bestDay = dailyPayments.reduce((best, current) => {
      return current.value > best.value ? current : best;
    }, { value: 0, date: '', fullDate: '' });

    // Calculate stats for selected month
    const monthInvoices = invoices.filter(invoice => {
      if (invoice.status !== 'paid' || !invoice.paymentDate) return false;
      const paymentDate = parseISO(invoice.paymentDate);
      return paymentDate >= monthStart && paymentDate <= monthEnd;
    });

    const totalValue = monthInvoices.reduce((sum, inv) => sum + inv.finalValue, 0);
    
    const todayPayments = invoices.filter(invoice => {
      if (invoice.status !== 'paid' || !invoice.paymentDate) return false;
      return isSameDay(parseISO(invoice.paymentDate), today);
    });
    
    const todayValue = todayPayments.reduce((sum, inv) => sum + inv.finalValue, 0);
    const todayCount = todayPayments.length;
    
    const last7Days = dailyPayments.slice(-7);
    const previous7Days = dailyPayments.slice(-14, -7);
    
    const last7Average = last7Days.reduce((sum, day) => sum + day.value, 0) / 7;
    const previous7Average = previous7Days.length > 0
      ? previous7Days.reduce((sum, day) => sum + day.value, 0) / 7
      : 0;
    
    const trend = previous7Average > 0 
      ? ((last7Average - previous7Average) / previous7Average) * 100 
      : 0;

    return {
      chartData: dailyPayments,
      totalValue,
      todayValue,
      todayCount,
      average: last7Average,
      trend,
      bestDay: { value: bestDay.value, date: bestDay.fullDate },
    };
  }, [invoices, selectedMonth, selectedYear]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-sm border border-slate-700 rounded-lg p-3 shadow-xl">
          <p className="text-slate-200 font-medium text-sm mb-2">
            {payload[0].payload.fullDate}
          </p>
          <div className="space-y-1">
            <p className="text-emerald-400 font-bold text-lg">
              R$ {(payload[0].value || 0).toFixed(2)}
            </p>
            <p className="text-slate-400 text-xs">
              {payload[0].payload.count} {payload[0].payload.count === 1 ? 'pagamento' : 'pagamentos'}
            </p>
          </div>
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
              <div className="p-2 rounded-lg bg-amber-500/20 backdrop-blur-sm">
                <DollarSign className="h-5 w-5 text-amber-400" />
              </div>
              <CardTitle className="text-xl font-headline font-bold text-slate-900 dark:text-white">
                Pagamentos Por Dia
              </CardTitle>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Faturamento diário do período selecionado
            </p>
          </div>
          <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="bg-amber-50 dark:bg-slate-800/50 border-amber-200 dark:border-slate-700 text-amber-700 dark:text-slate-300 hover:bg-amber-100 dark:hover:bg-slate-700/50 hover:text-amber-900 dark:hover:text-white backdrop-blur-sm shadow-sm"
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
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Mês Atual
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-xl p-3 backdrop-blur-sm">
            <p className="text-xs text-amber-600 dark:text-amber-400/80 font-medium mb-1">Total</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              R$ {stats.totalValue.toFixed(0)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">recebido</p>
          </div>
          
          <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-xl p-3 backdrop-blur-sm">
            <p className="text-xs text-green-600 dark:text-green-400/80 font-medium mb-1">Média/Dia</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              R$ {stats.average.toFixed(0)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">últimos 7 dias</p>
          </div>
          
          <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border border-cyan-500/20 rounded-xl p-3 backdrop-blur-sm">
            <p className="text-xs text-cyan-600 dark:text-cyan-400/80 font-medium mb-1">Hoje</p>
            <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
              {stats.todayCount}
            </p>
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
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              R$ {stats.bestDay.value.toFixed(0)}
            </p>
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
                <linearGradient id="colorPayments" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
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
                tickFormatter={(value) => `R$ ${value}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#f59e0b" 
                strokeWidth={2}
                fill="url(#colorPayments)"
                animationDuration={1000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Today's Highlight */}
        {stats.todayValue > 0 && (
          <div className="mt-4 p-3 bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/20 rounded-lg backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-400" />
                <span className="text-sm text-slate-300 font-medium">Recebido hoje</span>
              </div>
              <span className="text-lg font-bold text-emerald-400">
                R$ {stats.todayValue.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </CardContent>

      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-green-500/5 rounded-full blur-3xl -z-10" />
    </Card>
  );
}
