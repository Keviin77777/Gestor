'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  AlertCircle,
  UserCog,
  Calendar,
  CheckCircle,
  XCircle,
  Activity,
  Zap
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Client {
  id: string;
  name: string;
  email: string;
  status: string;
  value: number;
  renewal_date: string;
  reseller_id: string;
}

interface Reseller {
  id: string;
  email: string;
  display_name: string;
  total_clients: number;
  active_clients: number;
}

interface DashboardStats {
  resellers: {
    total: number;
    active: number;
    expiring: number;
    expired: number;
    revenue: number;
  };
  clients: {
    total: number;
    active: number;
    inactive: number;
    revenue: number;
  };
  totalRevenue: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    resellers: { total: 0, active: 0, expiring: 0, expired: 0, revenue: 0 },
    clients: { total: 0, active: 0, inactive: 0, revenue: 0 },
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showResellerPreview, setShowResellerPreview] = useState(false);
  const [clientsList, setClientsList] = useState<Client[]>([]);
  const [resellersList, setResellersList] = useState<Reseller[]>([]);

  const apiUrl = process.env.NEXT_PUBLIC_PHP_API_URL || 'http://localhost:8080';

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);

      // Buscar estatísticas de revendas
      const resellersRes = await fetch(`/api/admin-resellers`, {
        credentials: 'include',
      });
      const resellersData = await resellersRes.json();

      // Buscar estatísticas de clientes
      const clientsRes = await fetch(`/api/clients`, {
        credentials: 'include',
      });
      const clientsData = await clientsRes.json();
      
      console.log('[AdminDashboard] Resposta da API de clientes:', clientsData);
      console.log('[AdminDashboard] Status da resposta:', clientsRes.status);

      // Calcular estatísticas
      const resellers = resellersData.resellers || [];
      const clients = clientsData.clients || [];
      
      console.log('[AdminDashboard] Total de clientes:', clients.length);
      console.log('[AdminDashboard] Clientes:', clients);

      const resellerStats = {
        total: resellers.length,
        active: resellers.filter((r: any) => r.is_active).length,
        expiring: resellers.filter((r: any) => r.subscription_health === 'expiring_soon').length,
        expired: resellers.filter((r: any) => r.subscription_health === 'expired').length,
        revenue: 0,
      };

      const clientStats = {
        total: clients.length,
        active: clients.filter((c: any) => c.status === 'active').length,
        inactive: clients.filter((c: any) => c.status !== 'active').length,
        revenue: clients.reduce((sum: number, c: any) => sum + (Number(c.value) || 0), 0),
      };

      setStats({
        resellers: resellerStats,
        clients: clientStats,
        totalRevenue: clientStats.revenue, // Apenas receita dos clientes diretos do admin
      });
      
      // Salvar listas para exibição
      setClientsList(clients);
      setResellersList(resellers);
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Se estiver no modo preview, importar e mostrar o dashboard de revenda
  if (showResellerPreview) {
    const ResellerDashboard = require('./reseller-dashboard').default;
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Preview: Dashboard de Revenda</h1>
            <p className="text-muted-foreground">Visualizando como uma revenda vê o dashboard</p>
          </div>
          <button
            onClick={() => setShowResellerPreview(false)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Voltar ao Dashboard Admin
          </button>
        </div>
        <div className="border-4 border-blue-500 rounded-lg p-6 bg-blue-50/50 dark:bg-blue-950/20">
          <ResellerDashboard />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-headline font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
            Dashboard Administrativo 🚀
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Gerencie suas revendas e seus clientes diretos
          </p>
        </div>
        <button
          onClick={() => setShowResellerPreview(true)}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
        >
          <Zap className="h-4 w-4" />
          Visualizar como Revenda
        </button>
      </div>

      {/* Stats Cards - Primeira Fileira */}
      <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 animate-slide-up max-w-full">
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-50 via-blue-50 to-indigo-100 dark:from-blue-950/50 dark:via-blue-900/30 dark:to-indigo-950/50 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="space-y-1">
              <CardTitle className="text-sm font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                Receita Clientes
              </CardTitle>
              <p className="text-xs text-blue-600/70 dark:text-blue-400/70">Seus clientes diretos</p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-3 shadow-lg group-hover:scale-110 transition-transform duration-300">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-headline font-bold text-blue-900 dark:text-blue-100">
              {formatCurrency(stats.totalRevenue)}
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <div className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="h-4 w-4" />
                <span className="font-medium">Sistema ativo</span>
              </div>
            </div>
          </CardContent>
          <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-gradient-to-br from-blue-400/10 to-indigo-500/10 group-hover:scale-110 transition-transform duration-500"></div>
        </Card>

        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-purple-50 via-purple-50 to-pink-100 dark:from-purple-950/50 dark:via-purple-900/30 dark:to-pink-950/50 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="space-y-1">
              <CardTitle className="text-sm font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide">
                Total Revendas
              </CardTitle>
              <p className="text-xs text-purple-600/70 dark:text-purple-400/70">Cadastradas</p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 p-3 shadow-lg group-hover:scale-110 transition-transform duration-300">
              <UserCog className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-headline font-bold text-purple-900 dark:text-purple-100">
              {stats.resellers.total}
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <div className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium">{stats.resellers.active} ativas</span>
              </div>
            </div>
          </CardContent>
          <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-gradient-to-br from-purple-400/10 to-pink-500/10 group-hover:scale-110 transition-transform duration-500"></div>
        </Card>

        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-50 via-green-50 to-teal-100 dark:from-emerald-950/50 dark:via-green-900/30 dark:to-teal-950/50 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="space-y-1">
              <CardTitle className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
                Meus Clientes
              </CardTitle>
              <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">Clientes diretos</p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-3 shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Users className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-headline font-bold text-emerald-900 dark:text-emerald-100">
              {stats.clients.total}
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <div className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400">
                <Activity className="h-4 w-4" />
                <span className="font-medium">{stats.clients.active} ativos</span>
              </div>
            </div>
          </CardContent>
          <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-gradient-to-br from-emerald-400/10 to-teal-500/10 group-hover:scale-110 transition-transform duration-500"></div>
        </Card>

        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-amber-50 via-orange-50 to-red-100 dark:from-amber-950/50 dark:via-orange-900/30 dark:to-red-950/50 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="space-y-1">
              <CardTitle className="text-sm font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide">
                Alertas
              </CardTitle>
              <p className="text-xs text-amber-600/70 dark:text-amber-400/70">Revendas</p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-red-600 p-3 shadow-lg group-hover:scale-110 transition-transform duration-300">
              <AlertCircle className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-headline font-bold text-amber-900 dark:text-amber-100">
              {stats.resellers.expiring + stats.resellers.expired}
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <div className="flex items-center space-x-1 text-amber-600 dark:text-amber-400">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">Vencendo/Vencidas</span>
              </div>
            </div>
          </CardContent>
          <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-gradient-to-br from-amber-400/10 to-red-500/10 group-hover:scale-110 transition-transform duration-500"></div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="resellers">Revendas</TabsTrigger>
          <TabsTrigger value="clients">Clientes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <CardTitle>Receita por Fonte</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="font-medium">Meus Clientes</span>
                  </div>
                  <span className="font-bold text-blue-600">{formatCurrency(stats.clients.revenue)}</span>
                </div>
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold">Receita Mensal</span>
                    <span className="text-2xl font-bold text-green-600">{formatCurrency(stats.clients.revenue)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl">
              <CardHeader>
                <CardTitle>Status do Sistema</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Revendas Ativas</span>
                    <span className="font-medium">{stats.resellers.active}/{stats.resellers.total}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all" 
                      style={{ width: `${stats.resellers.total > 0 ? (stats.resellers.active / stats.resellers.total) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Clientes Ativos</span>
                    <span className="font-medium">{stats.clients.active}/{stats.clients.total}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full transition-all" 
                      style={{ width: `${stats.clients.total > 0 ? (stats.clients.active / stats.clients.total) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Saúde do Sistema</span>
                    <Badge className="bg-green-500">Excelente</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="resellers" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total</CardTitle>
                <UserCog className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.resellers.total}</div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ativas</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.resellers.active}</div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Vencendo</CardTitle>
                <Calendar className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{stats.resellers.expiring}</div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Vencidas</CardTitle>
                <XCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.resellers.expired}</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="clients" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.clients.total}</div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ativos</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.clients.active}</div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
                <DollarSign className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(stats.clients.revenue)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Lista de Clientes */}
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle>Meus Clientes Diretos</CardTitle>
              <p className="text-sm text-muted-foreground">
                Clientes cadastrados diretamente pelo admin
              </p>
            </CardHeader>
            <CardContent>
              {clientsList.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {clientsList.map((client) => (
                    <div key={client.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold">{client.name}</p>
                          <p className="text-sm text-muted-foreground">{client.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-bold text-green-600">{formatCurrency(Number(client.value))}</p>
                          <p className="text-xs text-muted-foreground">
                            Vence: {new Date(client.renewal_date).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                          {client.status === 'active' ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>Nenhum cliente cadastrado ainda</p>
                  <p className="text-xs mt-2">Cadastre clientes através do menu "Clientes → Adicionar"</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
