"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

interface ReportChartProps {
  title: string;
  description?: string;
  data: any[];
  type: 'line' | 'bar' | 'pie';
  dataKeys: {
    x?: string;
    y: string | string[];
    name?: string;
  };
  colors?: string[];
  height?: number;
}

const DEFAULT_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
];

export function ReportChart({ 
  title, 
  description, 
  data, 
  type, 
  dataKeys, 
  colors = DEFAULT_COLORS,
  height = 300 
}: ReportChartProps) {
  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
              <XAxis 
                dataKey={dataKeys.x} 
                className="text-xs text-slate-600 dark:text-slate-400"
              />
              <YAxis className="text-xs text-slate-600 dark:text-slate-400" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              {Array.isArray(dataKeys.y) ? (
                dataKeys.y.map((key, index) => (
                  <Line 
                    key={key}
                    type="monotone" 
                    dataKey={key} 
                    stroke={colors[index % colors.length]}
                    strokeWidth={2}
                    dot={{ fill: colors[index % colors.length] }}
                  />
                ))
              ) : (
                <Line 
                  type="monotone" 
                  dataKey={dataKeys.y} 
                  stroke={colors[0]}
                  strokeWidth={2}
                  dot={{ fill: colors[0] }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
              <XAxis 
                dataKey={dataKeys.x} 
                className="text-xs text-slate-600 dark:text-slate-400"
              />
              <YAxis className="text-xs text-slate-600 dark:text-slate-400" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              {Array.isArray(dataKeys.y) ? (
                dataKeys.y.map((key, index) => (
                  <Bar 
                    key={key}
                    dataKey={key} 
                    fill={colors[index % colors.length]}
                    radius={[8, 8, 0, 0]}
                  />
                ))
              ) : (
                <Bar 
                  dataKey={dataKeys.y} 
                  fill={colors[0]}
                  radius={[8, 8, 0, 0]}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey={dataKeys.y as string}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50">
      <CardHeader>
        <CardTitle className="text-xl font-headline font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
          {title}
        </CardTitle>
        {description && (
          <CardDescription>{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {renderChart()}
      </CardContent>
    </Card>
  );
}

