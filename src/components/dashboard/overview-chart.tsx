"use client"

import React from "react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { useMySQL } from '@/lib/mysql-provider';
// Removed useCollection - using direct API calls;
// Removed Firebase Firestore imports;
import type { Client } from "@/lib/definitions";
import { useClients } from '@/hooks/use-clients';

export function OverviewChart() {
  const { user } = useMySQL();

  const { data: clients, isLoading: clientsLoading } = useClients();

  // Generate last 12 months data
  const generateMonthlyData = () => {
    const months = [];
    const monthNames = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];

    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = date.getMonth();
      const year = date.getFullYear();
      
      // Calculate revenue for this month
      const monthRevenue = clients?.filter(client => {
        const clientDate = new Date(client.start_date);
        return clientDate.getMonth() === month && clientDate.getFullYear() === year;
      }).reduce((sum, client) => sum + client.value, 0) || 0;

      months.push({
        month: monthNames[month],
        profit: monthRevenue,
        fullMonth: `${monthNames[month]} ${year}`
      });
    }

    return months;
  };

  const chartData = generateMonthlyData();

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={chartData}>
        <XAxis
          dataKey="month"
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `R$${value}`}
        />
        <Tooltip
          cursor={{ fill: 'hsl(var(--accent) / 0.1)' }}
          contentStyle={{ 
            backgroundColor: 'hsl(var(--background))',
            borderColor: 'hsl(var(--border))'
          }}
          labelFormatter={(value, payload) => {
            if (payload && payload[0]) {
              return payload[0].payload.fullMonth;
            }
            return value;
          }}
          formatter={(value: number) => [`R$ ${(value || 0).toFixed(2)}`, 'Receita']}
        />
        <Bar dataKey="profit" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
