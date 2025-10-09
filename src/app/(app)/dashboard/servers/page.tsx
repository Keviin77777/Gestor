"use client";

import React, { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  PlusCircle, 
  Server, 
  Users, 
  DollarSign, 
  Edit, 
  Trash2, 
  AlertCircle,
  Search,
  Filter,
  Grid,
  List,
  MoreVertical,
  Wifi,
  WifiOff,
  CheckCircle,
  XCircle,
  Loader2
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMySQL } from '@/lib/mysql-provider';
// Removed useCollection - using direct API calls;
// Removed Firebase Firestore imports;
import { mysqlApi } from '@/lib/mysql-api-client';
import type { Panel, Plan, Client } from "@/lib/definitions";
import { useClients } from '@/hooks/use-clients';
import { usePlans } from '@/hooks/use-plans';
import { usePanels } from '@/hooks/use-panels';

export default function ServersPage() {
  const { user } = useMySQL();
  const resellerId = user?.id;

  // Collections

  const { data: panels, isLoading: panelsLoading, refetch: refetchPanels } = usePanels();
  const { data: plans, isLoading: plansLoading } = usePlans();
  const { data: clients, isLoading: clientsLoading } = useClients();

  // View states
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCostType, setFilterCostType] = useState("all");
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'clients' | 'cost' | 'renewal'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Form states
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [editingPanel, setEditingPanel] = React.useState<Panel | null>(null);
  const [panelName, setPanelName] = React.useState("");
  const [renewalDate, setRenewalDate] = React.useState("");
  // costType removed - using fixed only
  const [monthlyCost, setMonthlyCost] = React.useState("");
  const [costPerActive, setCostPerActive] = React.useState("");
  
  // Integration states
  const [selectedIntegrationType, setSelectedIntegrationType] = React.useState<string>("");
  const [showIntegrationFields, setShowIntegrationFields] = React.useState(false);
  
  // Qpanel/Sigma states
  const [sigmaUrl, setSigmaUrl] = React.useState("");
  const [sigmaUsername, setSigmaUsername] = React.useState("");
  const [sigmaToken, setSigmaToken] = React.useState("");
  const [sigmaTestMode, setSigmaTestMode] = React.useState(false);
  const [isTestingConnection, setIsTestingConnection] = React.useState(false);
  const [connectionStatus, setConnectionStatus] = React.useState<{
    tested: boolean;
    success: boolean;
    message: string;
    userId?: string;
  }>({ tested: false, success: false, message: "" });

  const resetForm = () => {
    setPanelName("");
    setRenewalDate("");
    // setCostType removed
    setMonthlyCost("");
    setCostPerActive("");
    setSelectedIntegrationType("");
    setShowIntegrationFields(false);
    setSigmaUrl("");
    setSigmaUsername("");
    setSigmaToken("");
    setSigmaTestMode(false);
    setConnectionStatus({ tested: false, success: false, message: "" });
  };

  const handleSavePanel = async () => {
    if (!resellerId) {
      alert('Erro: usuário não autenticado.');
      return;
    }
    if (!panelName.trim()) {
      alert('Informe o nome do servidor.');
      return;
    }
    if (!renewalDate) {
      alert('Informe a data de renovação.');
      return;
    }

    const newPanel: Partial<Panel> = {
      reseller_id: resellerId,
      name: panelName.trim(),
      renewal_date: renewalDate,
      // costType removed,
      // Qpanel/Sigma integration
      sigma_connected: connectionStatus.success && !!connectionStatus.userId,
    };

    // Add cost fields based on type
    if (monthlyCost) {
      newPanel.monthly_cost = parseFloat(monthlyCost);
    }
    if (false /* perActive removed */) {
      newPanel.monthly_cost = parseFloat(costPerActive);
    }
    if (sigmaUrl.trim()) {
      newPanel.sigma_url = sigmaUrl.trim();
    }
    if (sigmaUsername.trim()) {
      newPanel.sigma_username = sigmaUsername.trim();
    }
    if (sigmaToken.trim()) {
      newPanel.sigma_token = sigmaToken.trim();
    }
    if (connectionStatus.userId) {
      newPanel.sigma_user_id = connectionStatus.userId;
    }
    if (connectionStatus.success) {
      newPanel// .sigmaLastSync removed = new Date().toISOString();
    }

    await mysqlApi.createPanel(newPanel);
    await refetchPanels(); // Recarregar lista de painéis
    resetForm();
    setIsDialogOpen(false);
  };

  const handleEditPanel = (panel: Panel) => {
    setEditingPanel(panel);
    setPanelName(panel.name);
    setRenewalDate(panel.renewal_date || '');
    // setCostType removed
    setMonthlyCost(panel.monthly_cost?.toString() || '');
    setCostPerActive(panel.monthly_cost?.toString() || '');
    
    // Configurar campos Sigma
    setSigmaUrl(panel.sigma_url || '');
    setSigmaUsername(panel.sigma_username || '');
    setSigmaToken(panel.sigma_token || '');
    
    
    // Se tem integração Sigma configurada, marcar como selecionado
    if (panel.sigma_url || panel.sigma_username || panel.sigma_token) {
      setSelectedIntegrationType('qpanel-sigma');
      setShowIntegrationFields(true);
    }
    
    setConnectionStatus({
      tested: !!panel.sigma_connected,
      success: !!panel.sigma_connected,
      message: panel.sigma_connected ? 'Conectado com sucesso' : '',
      userId: panel.sigma_user_id
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdatePanel = async () => {
    if (!resellerId) {
      alert('Erro: dados não encontrados.');
      return;
    }
    if (!panelName.trim()) {
      alert('Informe o nome do servidor.');
      return;
    }
    if (!renewalDate) {
      alert('Informe a data de renovação.');
      return;
    }

    const updatedPanel: Partial<Panel> = {
      name: panelName.trim(),
      renewal_date: renewalDate,
      monthly_cost: parseFloat(monthlyCost) || 0,
      // Qpanel/Sigma integration
      sigma_connected: connectionStatus.success && !!connectionStatus.userId,
    };
    
    // Sigma URL sempre atualiza se preenchido
    if (sigmaUrl.trim()) {
      updatedPanel.sigma_url = sigmaUrl.trim();
    }
    
    // Sigma Username: só atualiza se foi digitado algo novo
    // Se o campo está vazio mas existe valor salvo, mantém o valor existente
    if (sigmaUsername.trim()) {
      updatedPanel.sigma_username = sigmaUsername.trim();
    } else if (!editingPanel?.sigma_username) {
      // Se não tem valor salvo e campo está vazio, limpa
      updatedPanel.sigma_username = '';
    }
    // Se tem valor salvo e campo está vazio, não inclui no update (mantém o existente)
    
    // Sigma Token: mesma lógica do username
    if (sigmaToken.trim()) {
      updatedPanel.sigma_token = sigmaToken.trim();
    } else if (!editingPanel?.sigma_token) {
      // Se não tem valor salvo e campo está vazio, limpa
      updatedPanel.sigma_token = '';
    }
    // Se tem valor salvo e campo está vazio, não inclui no update (mantém o existente)
    
    if (connectionStatus.userId) {
      updatedPanel.sigma_user_id = connectionStatus.userId;
    }

    
    await mysqlApi.updatePanel(editingPanel!.id, updatedPanel);
    await refetchPanels(); // Recarregar lista de painéis
    resetForm();
    setIsEditDialogOpen(false);
    setEditingPanel(null);
  };

  const handleDeletePanel = async (panel: Panel) => {
    if (!resellerId) {
      alert('Erro: usuário não autenticado.');
      return;
    }

    const confirmDelete = window.confirm(`Tem certeza que deseja excluir o servidor "${panel.name}"? Esta ação não pode ser desfeita.`);
    if (!confirmDelete) return;

    
    // TODO: Implement delete via API
  };

  const getActiveClientsForPanel = (panel_id: string) => {
    if (!clients || !plans) return 0;
    
    const panelPlans = plans.filter(plan => plan.panel_id === panel_id);
    return clients.filter(client => 
      client.status === 'active' && 
      panelPlans.some(plan => plan.id === client.plan_id)
    ).length;
  };

  const calculatePanelCost = (panel: Panel) => {
    const cost = Number(panel.monthly_cost) || 0;
    if (true /* monthly_cost is number */) {
      return cost;
    } else {
      const activeClients = getActiveClientsForPanel(panel.id);
      return cost * activeClients;
    }
  };

  const isExpiringSoon = (renewalDate: string) => {
    const renewal = new Date(renewalDate + 'T00:00:00');
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    return renewal <= sevenDaysFromNow;
  };

  const handleTestSigmaConnection = async () => {
    if (!sigmaUrl.trim() || !sigmaUsername.trim() || !sigmaToken.trim()) {
      setConnectionStatus({
        tested: true,
        success: false,
        message: 'Preencha todos os campos do Qpanel/Sigma'
      });
      return;
    }

    setIsTestingConnection(true);
    setConnectionStatus({ tested: false, success: false, message: "" });

    try {
      const response = await fetch('/api/sigma/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: sigmaUrl.trim(),
          username: sigmaUsername.trim(),
          token: sigmaToken.trim(),
          testMode: sigmaTestMode,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      setConnectionStatus({
        tested: true,
        success: result.success,
        message: result.success 
          ? 'Conectado com sucesso!' 
          : result.error || 'Erro ao conectar',
        userId: result.userId
      });
    } catch (error) {
      setConnectionStatus({
        tested: true,
        success: false,
        message: 'Erro ao testar conexão'
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Filtered and sorted panels
  const filteredAndSortedPanels = useMemo(() => {
    if (!panels) return [];

    let filtered = panels.filter(panel => {
      const matchesSearch = panel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           panel.login?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCostType = true; // Always match
      const matchesStatus = filterStatus === 'all' || 
        (filterStatus === 'expiring' && panel.renewal_date && isExpiringSoon(panel.renewal_date)) ||
        (filterStatus === 'active' && (!panel.renewal_date || !isExpiringSoon(panel.renewal_date)));
      
      return matchesSearch && matchesCostType && matchesStatus;
    });

    // Sort panels
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'clients':
          aValue = getActiveClientsForPanel(a.id);
          bValue = getActiveClientsForPanel(b.id);
          break;
        case 'cost':
          aValue = calculatePanelCost(a);
          bValue = calculatePanelCost(b);
          break;
        case 'renewal':
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [panels, searchTerm, filterCostType, filterStatus, sortBy, sortOrder, clients, plans]);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Servidores</h1>
          <p className="text-muted-foreground">
            Gerencie seus servidores IPTV e monitore custos
          </p>
        </div>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Seus Servidores
                {filteredAndSortedPanels.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {filteredAndSortedPanels.length}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>Gerencie seus servidores IPTV e monitore custos</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center border rounded-lg">
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="rounded-r-none"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-l-none"
                >
                  <Grid className="h-4 w-4" />
                </Button>
              </div>
              <Button onClick={() => setIsDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Novo Servidor
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar servidores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={filterCostType} onValueChange={setFilterCostType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tipo de cobrança" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="fixed">Valor Fixo</SelectItem>
                  <SelectItem value="perActive">Por Cliente</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="expiring">Expirando</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Loading State */}
          {panelsLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2 text-muted-foreground">Carregando servidores...</span>
            </div>
          )}

          {/* Table View */}
          {!panelsLoading && viewMode === 'table' && (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        if (sortBy === 'name') {
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortBy('name');
                          setSortOrder('asc');
                        }
                      }}
                    >
                      Servidor {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        if (sortBy === 'clients') {
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortBy('clients');
                          setSortOrder('desc');
                        }
                      }}
                    >
                      Clientes {sortBy === 'clients' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        if (sortBy === 'cost') {
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortBy('cost');
                          setSortOrder('desc');
                        }
                      }}
                    >
                      Custo Mensal {sortBy === 'cost' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        if (sortBy === 'renewal') {
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortBy('renewal');
                          setSortOrder('asc');
                        }
                      }}
                    >
                      Renovação {sortBy === 'renewal' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Qpanel/Sigma</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedPanels.map(panel => {
                    const activeClients = getActiveClientsForPanel(panel.id);
                    const monthlyCost = calculatePanelCost(panel);
                    const expiringSoon = panel.renewal_date ? isExpiringSoon(panel.renewal_date) : false;

                    return (
                      <TableRow key={panel.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                              <Server className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <div className="font-medium">{panel.name}</div>
                              <div className="text-sm text-muted-foreground">{panel.login}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{activeClients}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-green-600">
                            R$ {monthlyCost.toFixed(2).replace('.', ',')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {true /* monthly_cost is number */ ? 'Fixo' : 'Por Cliente'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {panel.renewal_date ? new Date(panel.renewal_date + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não definida'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {expiringSoon && <AlertCircle className="h-4 w-4 text-orange-500" />}
                            <Badge variant={expiringSoon ? "destructive" : "secondary"}>
                              {expiringSoon ? "Expirando" : "Ativo"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {panel.sigma_connected ? (
                              <>
                                <Wifi className="h-4 w-4 text-green-500" />
                                <Badge variant="secondary" className="text-green-700 bg-green-50">
                                  Conectado
                                </Badge>
                              </>
                            ) : (
                              <>
                                <WifiOff className="h-4 w-4 text-gray-400" />
                                <Badge variant="outline" className="text-gray-500">
                                  Não conectado
                                </Badge>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditPanel(panel)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeletePanel(panel)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Grid View */}
          {!panelsLoading && viewMode === 'grid' && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredAndSortedPanels.map((panel) => {
                const activeClients = getActiveClientsForPanel(panel.id);
                const monthlyCost = calculatePanelCost(panel);
                const expiringSoon = panel.renewal_date ? isExpiringSoon(panel.renewal_date) : false;

                return (
                  <Card key={panel.id} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                            <Server className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{panel.name}</CardTitle>
                            <p className="text-sm text-muted-foreground">{panel.login}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {expiringSoon && (
                            <AlertCircle className="h-4 w-4 text-orange-500" />
                          )}
                          <Badge variant={expiringSoon ? "destructive" : "secondary"}>
                            {expiringSoon ? "Expira em breve" : "Ativo"}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Clientes</span>
                          </div>
                          <p className="text-2xl font-bold text-blue-600">{activeClients}</p>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Custo Mensal</span>
                          </div>
                          <p className="text-2xl font-bold text-green-600">R$ {monthlyCost.toFixed(2)}</p>
                        </div>
                      </div>

                      {/* Renewal Date */}
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Renovação</p>
                        <p className="text-sm">{panel.renewal_date ? new Date(panel.renewal_date + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não definida'}</p>
                      </div>

                      {/* Cost Type */}
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Tipo de Cobrança</p>
                        <Badge variant="outline">
                          {true /* monthly_cost is number */ ? 'Valor Fixo' : 'Por Cliente Ativo'}
                        </Badge>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditPanel(panel)}
                          className="flex-1"
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeletePanel(panel)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Empty State */}
          {!panelsLoading && filteredAndSortedPanels.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Server className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {panels && panels.length > 0 ? 'Nenhum servidor encontrado' : 'Nenhum servidor cadastrado'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {panels && panels.length > 0 
                  ? 'Tente ajustar os filtros de busca' 
                  : 'Comece adicionando seu primeiro servidor'
                }
              </p>
              {(!panels || panels.length === 0) && (
                <Button onClick={() => setIsDialogOpen(true)}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Adicionar Servidor
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Server Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(o) => { setIsDialogOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar Servidor</DialogTitle>
            <DialogDescription>
              Configure um novo servidor IPTV
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Servidor</Label>
              <Input
                id="name"
                value={panelName}
                onChange={(e) => setPanelName(e.target.value)}
                placeholder="Ex: Servidor Principal"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="renewal">Data de Renovação</Label>
              <Input
                id="renewal"
                type="date"
                value={renewalDate}
                onChange={(e) => setRenewalDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de Cobrança</Label>
              <Select value={"fixed"} onValueChange={() => {}}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Valor Fixo Mensal</SelectItem>
                  <SelectItem value="perActive">Por Cliente Ativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {true ? (
              <div className="space-y-2">
                <Label htmlFor="monthlyCost">Custo Mensal (R$)</Label>
                <Input
                  id="monthlyCost"
                  type="number"
                  step="0.01"
                  value={monthlyCost}
                  onChange={(e) => setMonthlyCost(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="costPerActive">Custo por Cliente Ativo (R$)</Label>
                <Input
                  id="costPerActive"
                  type="number"
                  step="0.01"
                  value={costPerActive}
                  onChange={(e) => setCostPerActive(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            )}

            {/* Qpanel/Sigma Integration Section */}
            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5 text-blue-600" />
                <Label className="text-base font-semibold">Integração de Painéis</Label>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="panelType">Painel</Label>
                <Select 
                  value={selectedIntegrationType} 
                  onValueChange={(value) => {
                    setSelectedIntegrationType(value);
                    setShowIntegrationFields(value !== "");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um painel para integração" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="qpanel-sigma">Qpanel/Sigma</SelectItem>
                    {/* Futuros painéis serão adicionados aqui */}
                  </SelectContent>
                </Select>
              </div>

              {showIntegrationFields && selectedIntegrationType === "qpanel-sigma" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="sigmaUrl">URL do Painel</Label>
                    <Input
                      id="sigmaUrl"
                      value={sigmaUrl}
                      onChange={(e) => setSigmaUrl(e.target.value)}
                      placeholder="https://seupainel.top"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sigmaUsername">Usuário</Label>
                    <Input
                      id="sigmaUsername"
                      value={sigmaUsername}
                      onChange={(e) => setSigmaUsername(e.target.value)}
                      placeholder={connectionStatus.success ? "Usuário já configurado" : "Username do revenda"}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sigmaToken">Token</Label>
                    <Input
                      id="sigmaToken"
                      type="text"
                      value={sigmaToken}
                      onChange={(e) => setSigmaToken(e.target.value)}
                      placeholder={connectionStatus.success ? "Token já configurado" : "Token de integração do Sigma"}
                    />
                  </div>

              {/* Test Mode Toggle */}
              <div className="flex items-center space-x-2">
                <Switch 
                  id="test-mode" 
                  checked={sigmaTestMode} 
                  onCheckedChange={setSigmaTestMode} 
                />
                <Label htmlFor="test-mode" className="text-sm">
                  Modo de teste (simular conexão)
                </Label>
              </div>

              {/* Test Connection Button */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTestSigmaConnection}
                  disabled={isTestingConnection || !sigmaUrl.trim() || !sigmaUsername.trim() || !sigmaToken.trim()}
                >
                  {isTestingConnection ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testando...
                    </>
                  ) : (
                    <>
                      <Wifi className="mr-2 h-4 w-4" />
                      Testar Conexão
                    </>
                  )}
                </Button>

                {connectionStatus.tested && (
                  <div className="flex items-center gap-2">
                    {connectionStatus.success ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-600">Conectado</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span className="text-sm text-red-600">Erro</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {connectionStatus.tested && (
                <div className={`text-sm p-2 rounded ${
                  connectionStatus.success 
                    ? 'bg-green-50 text-green-700 border border-green-200' 
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {connectionStatus.message}
                </div>
              )}
                </>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSavePanel}>
              Adicionar Servidor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Server Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(o) => { setIsEditDialogOpen(o); if (!o) { resetForm(); setEditingPanel(null); } }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Servidor</DialogTitle>
            <DialogDescription>
              Edite as configurações do servidor {editingPanel?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome do Servidor</Label>
              <Input
                id="edit-name"
                value={panelName}
                onChange={(e) => setPanelName(e.target.value)}
                placeholder="Ex: Servidor Principal"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-renewal">Data de Renovação</Label>
              <Input
                id="edit-renewal"
                type="date"
                value={renewalDate}
                onChange={(e) => setRenewalDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de Cobrança</Label>
              <Select value={"fixed"} onValueChange={() => {}}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Valor Fixo Mensal</SelectItem>
                  <SelectItem value="perActive">Por Cliente Ativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {true ? (
              <div className="space-y-2">
                <Label htmlFor="edit-monthlyCost">Custo Mensal (R$)</Label>
                <Input
                  id="edit-monthlyCost"
                  type="number"
                  step="0.01"
                  value={monthlyCost}
                  onChange={(e) => setMonthlyCost(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="edit-costPerActive">Custo por Cliente Ativo (R$)</Label>
                <Input
                  id="edit-costPerActive"
                  type="number"
                  step="0.01"
                  value={costPerActive}
                  onChange={(e) => setCostPerActive(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            )}

            {/* Panel Integration Section */}
            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5 text-blue-600" />
                <Label className="text-base font-semibold">Integração de Painéis</Label>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-panelType">Painel</Label>
                <Select 
                  value={selectedIntegrationType} 
                  onValueChange={(value) => {
                    setSelectedIntegrationType(value);
                    setShowIntegrationFields(value !== "");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um painel para integração" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="qpanel-sigma">Qpanel/Sigma</SelectItem>
                    {/* Futuros painéis serão adicionados aqui */}
                  </SelectContent>
                </Select>
              </div>

              {showIntegrationFields && selectedIntegrationType === "qpanel-sigma" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="edit-sigmaUrl">URL do Painel</Label>
                    <Input
                      id="edit-sigmaUrl"
                      value={sigmaUrl}
                      onChange={(e) => setSigmaUrl(e.target.value)}
                      placeholder="https://seupainel.top"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-sigmaUsername">Usuário</Label>
                    <Input
                      id="edit-sigmaUsername"
                      value={sigmaUsername}
                      onChange={(e) => setSigmaUsername(e.target.value)}
                      placeholder={editingPanel?.sigma_username ? "Usuário já cadastrado - digite para substituir" : "Username do revenda"}
                      className="font-mono"
                    />
                    {editingPanel?.sigma_username && (
                      <p className="text-xs text-muted-foreground">
                        🔒 Usuário salvo com segurança. Digite um novo valor para substituir.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-sigmaToken">Token</Label>
                    <Input
                      id="edit-sigmaToken"
                      type="password"
                      value={sigmaToken}
                      onChange={(e) => setSigmaToken(e.target.value)}
                      placeholder={editingPanel?.sigma_token ? "Token já cadastrado - digite para substituir" : "Token de integração do Sigma"}
                      className="font-mono"
                    />
                    {editingPanel?.sigma_token && (
                      <p className="text-xs text-muted-foreground">
                        🔒 Token salvo com segurança. Digite um novo valor para substituir.
                      </p>
                    )}
                  </div>

              {/* Test Connection Button */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTestSigmaConnection}
                  disabled={isTestingConnection || !sigmaUrl.trim() || !sigmaUsername.trim() || !sigmaToken.trim()}
                >
                  {isTestingConnection ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testando...
                    </>
                  ) : (
                    <>
                      <Wifi className="mr-2 h-4 w-4" />
                      Testar Conexão
                    </>
                  )}
                </Button>

                {connectionStatus.tested && (
                  <div className="flex items-center gap-2">
                    {connectionStatus.success ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-600">Conectado</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span className="text-sm text-red-600">Erro</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {connectionStatus.tested && (
                <div className={`text-sm p-2 rounded ${
                  connectionStatus.success 
                    ? 'bg-green-50 text-green-700 border border-green-200' 
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {connectionStatus.message}
                </div>
              )}
                </>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); resetForm(); setEditingPanel(null); }}>
              Cancelar
            </Button>
            <Button onClick={handleUpdatePanel}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}







