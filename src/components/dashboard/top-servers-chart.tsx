"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Server, Users, Award, DollarSign, Activity } from "lucide-react";
import type { Client, Panel, Plan } from "@/lib/definitions";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Cell, PieChart, Pie } from "recharts";

interface TopServersChartProps {
  clients?: Client[];
  panels?: Panel[];
  plans?: Plan[];
}

export function TopServersChart({ clients, panels, plans }: TopServersChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'bar' | 'pie'>('bar');

  const stats = useMemo(() => {
    if (!clients || !panels || !plans) {
      return {
        chartData: [],
        totalClients: 0,
        totalServers: 0,
        activeServers: 0,
        totalRevenue: 0,
        averageClientsPerServer: 0
      };
    }

    // Count clients per panel with revenue calculation
    const panelCounts = panels.map(panel => {
      // Find plans for this panel
      const panelPlans = plans.filter(plan => plan.panelId === panel.id);
      const planIds = panelPlans.map(p => p.id);

      // Get active clients using plans from this panel
      const panelClients = clients.filter(client =>
        client.status === 'active' && planIds.includes(client.planId)
      );

      const clientCount = panelClients.length;

      // Calculate revenue for this panel
      const revenue = panelClients.reduce((sum, client) => {
        if (client.useFixedValue && client.fixedValue) {
          return sum + client.fixedValue;
        }
        return sum + (client.paymentValue - (client.discountValue || 0));
      }, 0);

      return {
        id: panel.id,
        name: panel.name,
        clients: clientCount,
        revenue: revenue,
        costType: panel.costType,
        monthlyCost: panel.monthlyCost || 0,
        costPerActive: panel.costPerActive || 0,
      };
    });

    // Sort by client count and get top 6 (increased from 5)
    const sortedPanels = panelCounts
      .filter(p => p.clients > 0)
      .sort((a, b) => b.clients - a.clients)
      .slice(0, 6);

    // Calculate totals
    const totalClients = sortedPanels.reduce((sum, p) => sum + p.clients, 0);
    const totalRevenue = sortedPanels.reduce((sum, p) => sum + p.revenue, 0);
    const activeServers = sortedPanels.length;
    const averageClientsPerServer = activeServers > 0 ? totalClients / activeServers : 0;

    // Prepare chart data with enhanced metrics
    const chartData = sortedPanels.map((panel, index) => ({
      ...panel,
      percentage: totalClients > 0 ? (panel.clients / totalClients) * 100 : 0,
      revenuePercentage: totalRevenue > 0 ? (panel.revenue / totalRevenue) * 100 : 0,
      color: ENHANCED_COLORS[index % ENHANCED_COLORS.length],
      gradient: GRADIENTS[index % GRADIENTS.length],
    }));

    return {
      chartData,
      totalClients,
      totalServers: panels.length,
      activeServers,
      totalRevenue,
      averageClientsPerServer,
    };
  }, [clients, panels, plans]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-2xl min-w-[200px]">
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: data.color }}
            />
            <p className="text-slate-900 dark:text-white font-semibold text-sm">{data.name}</p>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-300 text-xs">Clientes:</span>
              <span className="font-semibold text-sm">{data.clients}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-300 text-xs">Receita:</span>
              <span className="font-semibold text-sm text-green-600">
                R$ {data.revenue.toFixed(2).replace('.', ',')}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-300 text-xs">% Clientes:</span>
              <span className="font-semibold text-sm" style={{ color: data.color }}>
                {data.percentage.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-300 text-xs">% Receita:</span>
              <span className="font-semibold text-sm text-emerald-600">
                {data.revenuePercentage.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomBar = (props: any) => {
    const { fill, x, y, width, height, index, payload } = props;
    const isActive = activeIndex === index;

    return (
      <g>
        <defs>
          <linearGradient id={`gradient-${index}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={fill} stopOpacity={0.8} />
            <stop offset="100%" stopColor={fill} stopOpacity={1} />
          </linearGradient>
        </defs>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={`url(#gradient-${index})`}
          opacity={activeIndex === null || isActive ? 1 : 0.6}
          rx={8}
          ry={8}
          style={{
            filter: isActive ? 'brightness(1.15) drop-shadow(0 4px 8px rgba(0,0,0,0.2))' : 'none',
            transition: 'all 0.3s ease',
          }}
        />
        {/* Subtle inner glow effect */}
        {isActive && (
          <rect
            x={x + 1}
            y={y + 1}
            width={width - 2}
            height={height - 2}
            fill="none"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth={1}
            rx={7}
            ry={7}
          />
        )}
      </g>
    );
  };

  const CustomPieCell = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent, index, fill } = props;
    const isActive = activeIndex === index;
    const radius = isActive ? outerRadius + 8 : outerRadius;

    return (
      <g>
        <defs>
          <radialGradient id={`pie-gradient-${index}`}>
            <stop offset="0%" stopColor={fill} stopOpacity={0.9} />
            <stop offset="100%" stopColor={fill} stopOpacity={1} />
          </radialGradient>
        </defs>
      </g>
    );
  };

  return (
    <Card className="border-0 shadow-xl bg-gradient-to-br from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 hover:shadow-2xl transition-all duration-300 overflow-hidden">
      {/* Header */}
      <CardHeader className="pb-4 space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-500/20 backdrop-blur-sm">
                <Server className="h-5 w-5 text-blue-400" />
              </div>
              <CardTitle className="text-xl font-headline font-bold text-slate-900 dark:text-white">
                Top 5 Servidores
              </CardTitle>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Servidores com mais clientes no período
            </p>
          </div>
          <Badge
            variant="outline"
            className="bg-purple-50 dark:bg-slate-800/50 border-purple-200 dark:border-slate-700 text-purple-700 dark:text-slate-300 backdrop-blur-sm shadow-sm"
          >
            <Award className="h-3 w-3 mr-1" />
            Ranking
          </Badge>
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border border-blue-500/20 rounded-xl p-3 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-blue-500" />
              <p className="text-xs text-blue-600 dark:text-blue-400/80 font-medium">Total Clientes</p>
            </div>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalClients}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">no top 6</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 rounded-xl p-3 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              <p className="text-xs text-emerald-600 dark:text-emerald-400/80 font-medium">Receita Total</p>
            </div>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              R$ {stats.totalRevenue.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">mensal</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border border-purple-500/20 rounded-xl p-3 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
            <div className="flex items-center gap-2 mb-2">
              <Server className="h-4 w-4 text-purple-500" />
              <p className="text-xs text-purple-600 dark:text-purple-400/80 font-medium">Servidores</p>
            </div>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {stats.activeServers}/{stats.totalServers}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">ativos</p>
          </div>

          <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-xl p-3 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-amber-500" />
              <p className="text-xs text-amber-600 dark:text-amber-400/80 font-medium">Média</p>
            </div>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {stats.averageClientsPerServer.toFixed(1)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">clientes/servidor</p>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Visualização
            </Badge>
            <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <button
                onClick={() => setViewMode('bar')}
                className={`px-3 py-1.5 text-xs font-medium transition-all ${viewMode === 'bar'
                  ? 'bg-blue-500 text-white'
                  : 'bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
              >
                Barras
              </button>
              <button
                onClick={() => setViewMode('pie')}
                className={`px-3 py-1.5 text-xs font-medium transition-all ${viewMode === 'pie'
                  ? 'bg-blue-500 text-white'
                  : 'bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
              >
                Pizza
              </button>
            </div>
          </div>
        </div>
      </CardHeader>

      {/* Chart */}
      <CardContent className="pb-6">
        {stats.chartData.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center">
              <Server className="h-10 w-10 text-slate-400" />
            </div>
            <div className="space-y-2">
              <p className="text-slate-600 dark:text-slate-400 font-medium">Nenhum servidor com clientes</p>
              <p className="text-sm text-slate-500 dark:text-slate-500">Adicione clientes aos seus servidores para ver as estatísticas</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Chart Container */}
            <div className="relative">
              {viewMode === 'bar' ? (
                /* Bar Chart */
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats.chartData}
                      layout="vertical"
                      margin={{ top: 10, right: 40, left: 20, bottom: 10 }}
                    >
                      <CartesianGrid
                        strokeDasharray="2 4"
                        stroke="#e2e8f0"
                        className="dark:stroke-slate-700"
                        opacity={0.4}
                        horizontal={true}
                        vertical={false}
                      />
                      <XAxis
                        type="number"
                        stroke="#94a3b8"
                        className="dark:stroke-slate-500"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `${value}`}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        stroke="#94a3b8"
                        className="dark:stroke-slate-500"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        width={120}
                        tickFormatter={(value) => value.length > 12 ? `${value.substring(0, 12)}...` : value}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }} />
                      <Bar
                        dataKey="clients"
                        radius={[0, 8, 8, 0]}
                        animationDuration={1200}
                        animationBegin={0}
                        shape={<CustomBar />}
                        onMouseEnter={(_, index) => setActiveIndex(index)}
                        onMouseLeave={() => setActiveIndex(null)}
                      >
                        {stats.chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                /* Pie Chart */
                <div className="h-[320px] w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.chartData}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        innerRadius={40}
                        paddingAngle={2}
                        dataKey="clients"
                        animationDuration={1200}
                        onMouseEnter={(_, index) => setActiveIndex(index)}
                        onMouseLeave={() => setActiveIndex(null)}
                      >
                        {stats.chartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                            stroke={activeIndex === index ? entry.color : 'transparent'}
                            strokeWidth={activeIndex === index ? 3 : 0}
                            style={{
                              filter: activeIndex === index ? 'brightness(1.1) drop-shadow(0 4px 8px rgba(0,0,0,0.2))' : 'none',
                              transform: activeIndex === index ? 'scale(1.05)' : 'scale(1)',
                              transformOrigin: 'center',
                              transition: 'all 0.3s ease',
                            }}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Enhanced Server List */}
            <div className="space-y-3">
              {stats.chartData.map((server, index) => (
                <div
                  key={server.id}
                  className={`group relative p-4 rounded-xl border transition-all duration-300 cursor-pointer ${activeIndex === index
                    ? 'bg-gradient-to-r from-blue-50 via-white to-purple-50 dark:from-slate-800 dark:via-slate-800/80 dark:to-slate-800 border-blue-200 dark:border-slate-600 shadow-lg scale-[1.02]'
                    : 'bg-white dark:bg-slate-800/30 border-slate-200 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md'
                    }`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Enhanced Rank Badge */}
                      <div
                        className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm"
                        style={{
                          background: `linear-gradient(135deg, ${server.color}20, ${server.color}10)`,
                          color: server.color,
                          border: `2px solid ${server.color}30`,
                        }}
                      >
                        {index + 1}
                      </div>

                      {/* Server Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {server.name}
                        </p>
                        <div className="flex items-center gap-4 mt-1">
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                            <span className="text-xs text-slate-600 dark:text-slate-400">
                              {server.clients} {server.clients === 1 ? 'cliente' : 'clientes'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3 text-emerald-500" />
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                              R$ {server.revenue.toFixed(2).replace('.', ',')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Metrics */}
                      <div className="flex-shrink-0 text-right space-y-1">
                        <p className="text-lg font-bold" style={{ color: server.color }}>
                          {server.percentage.toFixed(1)}%
                        </p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          {server.revenuePercentage.toFixed(1)}% receita
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar - Only Clients */}
                  <div className="mt-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Participação</span>
                      <span className="text-xs font-medium" style={{ color: server.color }}>
                        {server.percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-1 bg-slate-200 dark:bg-slate-700/50 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${server.percentage}%`,
                          background: `linear-gradient(90deg, ${server.color}80, ${server.color})`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl -z-10" />
    </Card>
  );
}

// Enhanced color palette for servers
const ENHANCED_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
];

// Gradient definitions for enhanced visuals
const GRADIENTS = [
  'linear-gradient(135deg, #3b82f6, #1d4ed8)',
  'linear-gradient(135deg, #10b981, #059669)',
  'linear-gradient(135deg, #f59e0b, #d97706)',
  'linear-gradient(135deg, #8b5cf6, #7c3aed)',
  'linear-gradient(135deg, #ec4899, #db2777)',
  'linear-gradient(135deg, #06b6d4, #0891b2)',
];
