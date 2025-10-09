"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, MoreVertical, Edit, Trash2, CalendarIcon, Search, Grid, List, Eye, Server, Users, DollarSign, Zap, Shield } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Panel, Plan, Client } from "@/lib/definitions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMySQL } from '@/lib/mysql-provider';
// Removed Firebase Firestore imports;
// Removed useCollection - using direct API calls;
import { mysqlApi } from '@/lib/mysql-api-client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClients } from '@/hooks/use-clients';
import { usePlans } from '@/hooks/use-plans';
import { usePanels } from '@/hooks/use-panels';

export default function PlansPage() {
    const { user } = useMySQL();
    const resellerId = user?.id;

    const { data: panels, isLoading: panelsLoading } = usePanels();
    const { data: plans, isLoading: plansLoading, refetch: refetchPlans } = usePlans();
    const { data: clients, isLoading: clientsLoading } = useClients();

    // View states
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterPanel, setFilterPanel] = useState('all');
    const [filterDuration, setFilterDuration] = useState('all');
    const [sortBy, setSortBy] = useState<'name' | 'price' | 'duration' | 'clients'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    // Plan form states
    const [isAddPlanDialogOpen, setIsAddPlanDialogOpen] = useState(false);
    const [isEditPlanDialogOpen, setIsEditPlanDialogOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
    const [planName, setPlanName] = useState('');
    const [planSaleValue, setPlanSaleValue] = useState('');
    const [planDuration, setPlanDuration] = useState(1);
    const [planPanelId, setPlanPanelId] = useState('');

    const resetPlanForm = () => {
        setPlanName('');
        setPlanSaleValue('');
        setPlanDuration(1);
        setPlanPanelId('');
    };

    const formatCurrency = (value: number | string): string => {
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        return numValue.toFixed(2).replace('.', ',');
    };

    const formatDuration = (durationValue: number) => {
        // Verificar se é um número válido
        if (!durationValue || isNaN(durationValue) || durationValue <= 0) return '1 mês';
        
        // Assumir que o valor é em meses (duration_days do banco)
        const months = durationValue;
        
        if (months === 1) return '1 mês';
        if (months < 12) return `${months} meses`;
        
        const years = Math.floor(months / 12);
        const remainingMonths = months % 12;
        
        if (remainingMonths === 0) {
            return years === 1 ? '1 ano' : `${years} anos`;
        }
        
        return `${years} ano${years > 1 ? 's' : ''} e ${remainingMonths} mês${remainingMonths > 1 ? 'es' : ''}`;
    };

    const getActiveClientsForPlan = (plan_id: string) => {
        return clients?.filter(client => client.plan_id === plan_id && client.status === 'active').length || 0;
    };

    // Grouped plans by server
    const groupedPlans = useMemo(() => {
        if (!plans || !panels) return {};

        let filtered = plans.filter(plan => {
            const matchesSearch = plan.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesPanel = filterPanel === 'all' || plan.panel_id === filterPanel;
            const matchesDuration = filterDuration === 'all' || 
                (filterDuration === '1-3' && plan.duration_days >= 1 && plan.duration_days <= 3) ||
                (filterDuration === '4-6' && plan.duration_days >= 4 && plan.duration_days <= 6) ||
                (filterDuration === '7-12' && plan.duration_days >= 7 && plan.duration_days <= 12);
            
            return matchesSearch && matchesPanel && matchesDuration;
        });

        // Group by panel
        const grouped = filtered.reduce((acc, plan) => {
            const panelId = plan.panel_id || "no-panel";
            if (!acc[panelId]) {
                acc[panelId] = [];
            }
            acc[panelId].push(plan);
            return acc;
        }, {} as Record<string, Plan[]>);

        // Sort plans within each group
        Object.keys(grouped).forEach(panelId => {
            grouped[panelId].sort((a, b) => {
                let aValue: any, bValue: any;
                
                switch (sortBy) {
                    case 'name':
                        aValue = a.name.toLowerCase();
                        bValue = b.name.toLowerCase();
                        break;
                    case 'price':
                        aValue = a.value;
                        bValue = b.value;
                        break;
                    case 'duration':
                        aValue = a.duration_days;
                        bValue = b.duration_days;
                        break;
                    case 'clients':
                        aValue = getActiveClientsForPlan(a.id);
                        bValue = getActiveClientsForPlan(b.id);
                        break;
                    default:
                        return 0;
                }

                if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
                return 0;
            });
        });

        return grouped;
    }, [plans, panels, searchTerm, filterPanel, filterDuration, sortBy, sortOrder, clients]);

    // Get total count for badge
    const totalPlansCount = Object.values(groupedPlans).reduce((sum, plans) => sum + plans.length, 0);

    const handleAddPlan = async () => {
        if (!resellerId) {
            alert('Erro: usuário não autenticado.');
            return;
        }
        if (!planName.trim()) {
            alert('Informe o nome do plano.');
            return;
        }
        if (!planSaleValue || parseFloat(planSaleValue.replace(',', '.')) <= 0) {
            alert('Informe um valor de venda válido.');
            return;
        }
        if (!planPanelId) {
            alert('Selecione um painel para o plano.');
            return;
        }

        const newPlan = {
            reseller_id: resellerId,
            panel_id: planPanelId,
            name: planName.trim(),
            value: parseFloat(planSaleValue.replace(',', '.')),
            duration_days: planDuration,
        };

        try {
            await mysqlApi.createPlan(newPlan);
            await refetchPlans();
            resetPlanForm();
            setIsAddPlanDialogOpen(false);
        } catch (error) {
            console.error('Erro ao criar plano:', error);
            alert('Erro ao criar plano. Tente novamente.');
        }
    };

    const handleEditPlan = (plan: Plan) => {
        setEditingPlan(plan);
        setPlanName(plan.name);
        // Formatar o valor corretamente para edição - converter para número se for string
        const valueAsNumber = typeof plan.value === 'string' ? parseFloat(plan.value) : plan.value;
        setPlanSaleValue(valueAsNumber.toFixed(2));
        setPlanDuration(plan.duration_days || 1);
        setPlanPanelId(plan.panel_id || '');
        setIsEditPlanDialogOpen(true);
    };

    const handleUpdatePlan = async () => {
        if (!resellerId) {
            alert('Erro: dados não encontrados.');
            return;
        }
        if (!planName.trim()) {
            alert('Informe o nome do plano.');
            return;
        }
        if (!planSaleValue || parseFloat(planSaleValue.replace(',', '.')) <= 0) {
            alert('Informe um valor de venda válido.');
            return;
        }
        if (!planPanelId) {
            alert('Selecione um painel para o plano.');
            return;
        }

        const updatedPlan: Partial<Plan> = {
            name: planName.trim(),
            value: parseFloat(planSaleValue.replace(',', '.')),
            duration_days: planDuration,
            panel_id: planPanelId,
        };

        try {
            await mysqlApi.updatePlan(editingPlan!.id, updatedPlan);
            await refetchPlans();
            resetPlanForm();
            setIsEditPlanDialogOpen(false);
            setEditingPlan(null);
        } catch (error) {
            console.error('Erro ao atualizar plano:', error);
            alert('Erro ao atualizar plano. Tente novamente.');
        }
    };

    const handleDeletePlan = async (plan: Plan) => {
        if (!resellerId) {
            alert('Erro: usuário não autenticado.');
            return;
        }

        const activeClients = getActiveClientsForPlan(plan.id);
        if (activeClients > 0) {
            alert(`Não é possível excluir este plano pois há ${activeClients} cliente(s) ativo(s) usando-o.`);
            return;
        }

        const confirmDelete = window.confirm(`Tem certeza que deseja excluir o plano "${plan.name}"? Esta ação não pode ser desfeita.`);
        if (!confirmDelete) return;

        try {
            await mysqlApi.deletePlan(plan.id);
            await refetchPlans();
        } catch (error) {
            console.error('Erro ao excluir plano:', error);
            alert('Erro ao excluir plano. Tente novamente.');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="space-y-4">
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">Planos de Serviço</h1>
                    <p className="text-muted-foreground">
                        Gerencie os planos oferecidos aos seus clientes
                    </p>
                </div>
            </div>

            {/* Filters and Controls */}
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Eye className="h-5 w-5" />
                                Seus Planos
                                {totalPlansCount > 0 && (
                                    <Badge variant="secondary" className="ml-2">
                                        {totalPlansCount}
                                    </Badge>
                                )}
                            </CardTitle>
                            <CardDescription>Gerencie os planos que você oferece aos clientes</CardDescription>
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
                            <Button onClick={() => setIsAddPlanDialogOpen(true)}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Novo Plano
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
                                placeholder="Buscar planos..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Select value={filterPanel} onValueChange={setFilterPanel}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Filtrar por servidor" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os servidores</SelectItem>
                                    {panels?.map(panel => (
                                        <SelectItem key={panel.id} value={panel.id}>
                                            {panel.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={filterDuration} onValueChange={setFilterDuration}>
                                <SelectTrigger className="w-[150px]">
                                    <SelectValue placeholder="Duração" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas durações</SelectItem>
                                    <SelectItem value="1-3">1-3 meses</SelectItem>
                                    <SelectItem value="4-6">4-6 meses</SelectItem>
                                    <SelectItem value="7-12">7-12 meses</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Loading State */}
                    {plansLoading && (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            <span className="ml-2 text-muted-foreground">Carregando planos...</span>
                        </div>
                    )}

                    {/* Table View - Grouped by Server */}
                    {!plansLoading && viewMode === 'table' && (
                        <div className="space-y-6">
                            {Object.keys(groupedPlans).length === 0 ? (
                                <div className="text-center py-12 space-y-3">
                                    <div className="mx-auto w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                        <CalendarIcon className="h-8 w-8 text-slate-400" />
                                    </div>
                                    <p className="text-slate-500 font-medium">Nenhum plano encontrado</p>
                                    <p className="text-sm text-slate-400">Crie planos para seus servidores</p>
                                </div>
                            ) : (
                                Object.entries(groupedPlans).map(([panelId, serverPlans]) => {
                                    const panel = panels?.find(p => p.id === panelId);
                                    if (!panel || serverPlans.length === 0) return null;

                                    return (
                                        <div key={panelId} className="space-y-4">
                                            {/* Enhanced Server Header */}
                                            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-50 via-white to-slate-50 dark:from-slate-800 dark:via-slate-800/80 dark:to-slate-800 border border-slate-200 dark:border-slate-700 p-6 mb-6 shadow-sm hover:shadow-md transition-all duration-300">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className="relative">
                                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 flex items-center justify-center shadow-lg">
                                                                <Server className="h-7 w-7 text-white" />
                                                            </div>
                                                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center">
                                                                <div className="w-2 h-2 bg-white rounded-full"></div>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                                                {panel.name}
                                                            </h3>
                                                            <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                                                                <div className="flex items-center gap-1">
                                                                    <Zap className="h-4 w-4 text-blue-500" />
                                                                    <span>{serverPlans.length} {serverPlans.length === 1 ? 'plano' : 'planos'}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <Users className="h-4 w-4 text-emerald-500" />
                                                                    <span>{serverPlans.reduce((sum, plan) => sum + getActiveClientsForPlan(plan.id), 0)} clientes ativos</span>
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <DollarSign className="h-4 w-4 text-green-500" />
                                                                    <span>R$ {serverPlans.reduce((sum, plan) => {
                                                                        const value = typeof plan.value === 'string' ? parseFloat(plan.value) : plan.value;
                                                                        return sum + (value * getActiveClientsForPlan(plan.id));
                                                                    }, 0).toFixed(0)} receita</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-3 py-1">
                                                            <Shield className="h-3 w-3 mr-1" />
                                                            Ativo
                                                        </Badge>
                                                    </div>
                                                </div>
                                                
                                                {/* Decorative elements */}
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-full blur-2xl"></div>
                                                <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-emerald-500/5 to-blue-500/5 rounded-full blur-xl"></div>
                                            </div>

                                            {/* Plans Table for this Server */}
                                            <div className="border rounded-lg overflow-hidden">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow className="bg-slate-50 dark:bg-slate-800/50">
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
                                                                Plano {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                                                            </TableHead>
                                                            <TableHead 
                                                                className="cursor-pointer hover:bg-muted/50"
                                                                onClick={() => {
                                                                    if (sortBy === 'price') {
                                                                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                                                                    } else {
                                                                        setSortBy('price');
                                                                        setSortOrder('asc');
                                                                    }
                                                                }}
                                                            >
                                                                Valor {sortBy === 'price' && (sortOrder === 'asc' ? '↑' : '↓')}
                                                            </TableHead>
                                                            <TableHead 
                                                                className="cursor-pointer hover:bg-muted/50"
                                                                onClick={() => {
                                                                    if (sortBy === 'duration') {
                                                                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                                                                    } else {
                                                                        setSortBy('duration');
                                                                        setSortOrder('asc');
                                                                    }
                                                                }}
                                                            >
                                                                Duração {sortBy === 'duration' && (sortOrder === 'asc' ? '↑' : '↓')}
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
                                                            <TableHead className="text-right">Ações</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {serverPlans.map(plan => (
                                                            <TableRow key={plan.id} className="hover:bg-muted/50">
                                                                <TableCell>
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="relative">
                                                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 flex items-center justify-center shadow-md">
                                                                                <Zap className="h-5 w-5 text-white" />
                                                                            </div>
                                                                            <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-blue-500 rounded-full border border-white dark:border-slate-800"></div>
                                                                        </div>
                                                                        <div>
                                                                            <div className="font-semibold text-slate-900 dark:text-white">{plan.name}</div>
                                                                        </div>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="font-semibold text-green-600">
                                                                        R$ {formatCurrency(plan.value)}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Badge variant="outline" className="font-medium">
                                                                        {formatDuration(plan.duration_days)}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                                                        <span className="font-medium">
                                                                            {getActiveClientsForPlan(plan.id)}
                                                                        </span>
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
                                                                            <DropdownMenuItem onClick={() => handleEditPlan(plan)}>
                                                                                <Edit className="mr-2 h-4 w-4" />
                                                                                Editar
                                                                            </DropdownMenuItem>
                                                                            <DropdownMenuItem 
                                                                                onClick={() => handleDeletePlan(plan)}
                                                                                className="text-red-600"
                                                                            >
                                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                                Excluir
                                                                            </DropdownMenuItem>
                                                                        </DropdownMenuContent>
                                                                    </DropdownMenu>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {/* Grid View - Grouped by Server */}
                    {!plansLoading && viewMode === 'grid' && (
                        <div className="space-y-8">
                            {Object.keys(groupedPlans).length === 0 ? (
                                <div className="text-center py-12 space-y-3">
                                    <div className="mx-auto w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                        <CalendarIcon className="h-8 w-8 text-slate-400" />
                                    </div>
                                    <p className="text-slate-500 font-medium">Nenhum plano encontrado</p>
                                    <p className="text-sm text-slate-400">Crie planos para seus servidores</p>
                                </div>
                            ) : (
                                Object.entries(groupedPlans).map(([panelId, serverPlans]) => {
                                    const panel = panels?.find(p => p.id === panelId);
                                    if (!panel || serverPlans.length === 0) return null;

                                    return (
                                        <div key={panelId} className="space-y-4">
                                            {/* Enhanced Server Header for Grid */}
                                            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-50 via-white to-slate-50 dark:from-slate-800 dark:via-slate-800/80 dark:to-slate-800 border border-slate-200 dark:border-slate-700 p-6 mb-8 shadow-sm hover:shadow-lg transition-all duration-300">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className="relative">
                                                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 flex items-center justify-center shadow-xl">
                                                                <Server className="h-8 w-8 text-white" />
                                                            </div>
                                                            <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center">
                                                                <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                                                                {panel.name}
                                                            </h3>
                                                            <div className="flex items-center gap-6 text-sm text-slate-600 dark:text-slate-400">
                                                                <div className="flex items-center gap-1.5">
                                                                    <Zap className="h-4 w-4 text-blue-500" />
                                                                    <span className="font-medium">{serverPlans.length} {serverPlans.length === 1 ? 'plano' : 'planos'}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1.5">
                                                                    <Users className="h-4 w-4 text-emerald-500" />
                                                                    <span className="font-medium">{serverPlans.reduce((sum, plan) => sum + getActiveClientsForPlan(plan.id), 0)} clientes</span>
                                                                </div>
                                                                <div className="flex items-center gap-1.5">
                                                                    <DollarSign className="h-4 w-4 text-green-500" />
                                                                    <span className="font-medium">R$ {serverPlans.reduce((sum, plan) => {
                                                                        const value = typeof plan.value === 'string' ? parseFloat(plan.value) : plan.value;
                                                                        return sum + (value * getActiveClientsForPlan(plan.id));
                                                                    }, 0).toFixed(0)}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-2">
                                                        <Badge variant="secondary" className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 px-3 py-1.5">
                                                            <Shield className="h-3 w-3 mr-1" />
                                                            Online
                                                        </Badge>
                                                        <div className="text-xs text-slate-500 dark:text-slate-400">
                                                            Última sync: agora
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {/* Enhanced decorative elements */}
                                                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-500/8 to-purple-500/8 rounded-full blur-3xl"></div>
                                                <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-emerald-500/8 to-blue-500/8 rounded-full blur-2xl"></div>
                                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-1 bg-gradient-to-r from-transparent via-blue-500/10 to-transparent"></div>
                                            </div>

                                            {/* Plans Grid for this Server */}
                                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                                {serverPlans.map(plan => (
                                <Card key={plan.id} className="group relative overflow-hidden border border-slate-200/50 dark:border-slate-700/50 bg-gradient-to-br from-white via-slate-50/30 to-white dark:from-slate-900 dark:via-slate-800/50 dark:to-slate-900 shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-[1.03] hover:border-blue-300/50 dark:hover:border-blue-600/50">
                                    <CardHeader className="pb-4">
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative">
                                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 flex items-center justify-center shadow-lg">
                                                            <Zap className="h-6 w-6 text-white" />
                                                        </div>
                                                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center">
                                                            <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                                                            {plan.name}
                                                        </CardTitle>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <CalendarIcon className="h-3 w-3 text-slate-500" />
                                                            <span className="text-xs text-slate-500 font-medium">
                                                                {formatDuration(plan.duration_days)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48">
                                                    <DropdownMenuItem onClick={() => handleEditPlan(plan)} className="cursor-pointer">
                                                        <Edit className="mr-2 h-4 w-4" />
                                                        Editar Plano
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem 
                                                        onClick={() => handleDeletePlan(plan)} 
                                                        className="text-red-600 cursor-pointer focus:text-red-600"
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Excluir Plano
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </CardHeader>
                                    
                                    <CardContent className="space-y-4">
                                        {/* Enhanced Pricing Display */}
                                        <div className="relative overflow-hidden">
                                            <div className="text-center py-6 bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 dark:from-emerald-900/20 dark:via-green-900/20 dark:to-teal-900/20 rounded-2xl border border-emerald-200/50 dark:border-emerald-800/50 shadow-sm">
                                                <div className="flex items-center justify-center gap-1 mb-2">
                                                    <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                                    <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider">
                                                        Valor Mensal
                                                    </div>
                                                </div>
                                                <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-300 mb-1">
                                                    R$ {formatCurrency(plan.value)}
                                                </div>

                                                {/* Decorative elements */}
                                                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-full blur-xl"></div>
                                                <div className="absolute bottom-0 left-0 w-12 h-12 bg-gradient-to-tr from-green-500/10 to-emerald-500/10 rounded-full blur-lg"></div>
                                            </div>
                                        </div>

                                        {/* Enhanced Plan Information */}
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-800/50 dark:to-slate-800/30 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                                                <div className="flex items-center gap-2">
                                                    <Server className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                                                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Servidor</span>
                                                </div>
                                                <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-3 py-1">
                                                    {panels?.find(p => p.id === plan.panel_id)?.name || 'N/A'}
                                                </Badge>
                                            </div>
                                            
                                            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-900/10 rounded-xl border border-blue-200/50 dark:border-blue-800/50">
                                                <div className="flex items-center gap-2">
                                                    <Users className="h-4 w-4 text-blue-500" />
                                                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Clientes Ativos</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                                    <span className="font-bold text-blue-600 dark:text-blue-400 text-lg">
                                                        {getActiveClientsForPlan(plan.id)}
                                                    </span>
                                                </div>
                                            </div>

                                        </div>

                                        {/* Enhanced Actions */}
                                        <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700 mt-4">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleEditPlan(plan)}
                                                className="flex-1 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 text-blue-700 border-blue-300 dark:from-blue-900/20 dark:to-blue-900/30 dark:hover:from-blue-900/30 dark:hover:to-blue-900/40 dark:text-blue-300 dark:border-blue-700 shadow-sm hover:shadow-md transition-all duration-200"
                                            >
                                                <Edit className="mr-2 h-4 w-4" />
                                                Editar Plano
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleDeletePlan(plan)}
                                                className="bg-gradient-to-r from-red-50 to-red-100 hover:from-red-100 hover:to-red-200 text-red-700 border-red-300 dark:from-red-900/20 dark:to-red-900/30 dark:hover:from-red-900/30 dark:hover:to-red-900/40 dark:text-red-300 dark:border-red-700 shadow-sm hover:shadow-md transition-all duration-200"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                    
                                    {/* Enhanced Decorative elements */}
                                    <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-blue-500/8 via-purple-500/8 to-emerald-500/8 group-hover:scale-125 transition-transform duration-700 blur-2xl"></div>
                                    <div className="absolute -left-6 -bottom-6 h-24 w-24 rounded-full bg-gradient-to-tr from-emerald-500/8 via-teal-500/8 to-blue-500/8 group-hover:scale-125 transition-transform duration-700 blur-xl"></div>
                                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-px bg-gradient-to-r from-transparent via-blue-500/5 to-transparent group-hover:via-blue-500/10 transition-all duration-500"></div>
                                </Card>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {/* Empty State */}
                    {!plansLoading && totalPlansCount === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="rounded-full bg-muted p-4 mb-4">
                                <PlusCircle className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">
                                {plans && plans.length > 0 ? 'Nenhum plano encontrado' : 'Nenhum plano cadastrado'}
                            </h3>
                            <p className="text-muted-foreground mb-4">
                                {plans && plans.length > 0 
                                    ? 'Tente ajustar os filtros de busca' 
                                    : 'Comece criando seu primeiro plano de serviço'
                                }
                            </p>
                            {(!plans || plans.length === 0) && (
                                <Button onClick={() => setIsAddPlanDialogOpen(true)}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Adicionar Plano
                                </Button>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add Plan Dialog */}
            <Dialog open={isAddPlanDialogOpen} onOpenChange={setIsAddPlanDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader className="space-y-3">
                        <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                <PlusCircle className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-semibold">Criar Novo Plano</DialogTitle>
                                <DialogDescription className="text-sm text-muted-foreground">
                                    Configure um plano de serviço para seus clientes
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>
                    
                    <div className="space-y-6 py-4">
                        {/* Informações Básicas */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Informações Básicas</h3>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="plan-name" className="text-sm font-medium">Nome do Plano</Label>
                                    <Input
                                        id="plan-name"
                                        value={planName}
                                        onChange={(e) => setPlanName(e.target.value)}
                                        placeholder="Ex: Plano Premium"
                                        className="border-2 border-border/60 focus:border-primary/60"
                                    />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="plan-sale-value" className="text-sm font-medium">Valor Mensal (R$)</Label>
                                        <Input
                                            id="plan-sale-value"
                                            value={planSaleValue}
                                            onChange={(e) => {
                                                // Permitir apenas números, vírgula e ponto
                                                const value = e.target.value.replace(/[^\d,\.]/g, '');
                                                setPlanSaleValue(value);
                                            }}
                                            placeholder="29,90"
                                            className="border-2 border-border/60 focus:border-primary/60"
                                        />
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <Label htmlFor="plan-duration" className="text-sm font-medium">Duração</Label>
                                        <Select value={planDuration.toString()} onValueChange={(value) => setPlanDuration(parseInt(value))}>
                                            <SelectTrigger className="border-2 border-border/60 focus:border-primary/60">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="1">1 mês</SelectItem>
                                                <SelectItem value="2">2 meses</SelectItem>
                                                <SelectItem value="3">3 meses</SelectItem>
                                                <SelectItem value="4">4 meses</SelectItem>
                                                <SelectItem value="5">5 meses</SelectItem>
                                                <SelectItem value="6">6 meses</SelectItem>
                                                <SelectItem value="7">7 meses</SelectItem>
                                                <SelectItem value="8">8 meses</SelectItem>
                                                <SelectItem value="9">9 meses</SelectItem>
                                                <SelectItem value="10">10 meses</SelectItem>
                                                <SelectItem value="11">11 meses</SelectItem>
                                                <SelectItem value="12">12 meses (1 ano)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Configuração do Servidor */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Servidor</h3>
                            <div className="space-y-2">
                                <Label htmlFor="plan-panel" className="text-sm font-medium">Servidor IPTV</Label>
                                <Select value={planPanelId} onValueChange={setPlanPanelId}>
                                    <SelectTrigger className="border-2 border-border/60 focus:border-primary/60">
                                        <SelectValue placeholder="Selecione um servidor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {panels?.map(panel => (
                                            <SelectItem key={panel.id} value={panel.id}>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                    {panel.name}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {!panels || panels.length === 0 && (
                                    <p className="text-xs text-orange-600">
                                        Nenhum servidor encontrado. Crie um servidor primeiro.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <DialogFooter className="flex flex-col sm:flex-row gap-3">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsAddPlanDialogOpen(false);
                                resetPlanForm();
                            }}
                            className="w-full sm:w-auto"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleAddPlan}
                            className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-700 hover:from-blue-700 hover:to-purple-800"
                        >
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Criar Plano
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Plan Dialog */}
            <Dialog open={isEditPlanDialogOpen} onOpenChange={setIsEditPlanDialogOpen}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader className="space-y-3">
                        <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                                <Edit className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-semibold">Editar Plano</DialogTitle>
                                <DialogDescription className="text-sm text-muted-foreground">
                                    Atualize as informações do plano
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-plan-name">Nome do Plano</Label>
                            <Input
                                id="edit-plan-name"
                                value={planName}
                                onChange={(e) => setPlanName(e.target.value)}
                                placeholder="Ex: Plano Premium"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-plan-sale-value">Valor de Venda (R$)</Label>
                            <Input
                                id="edit-plan-sale-value"
                                value={planSaleValue}
                                onChange={(e) => {
                                    // Permitir apenas números, vírgula e ponto
                                    const value = e.target.value.replace(/[^\d,\.]/g, '');
                                    setPlanSaleValue(value);
                                }}
                                placeholder="Ex: 29,90"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-plan-duration">Duração</Label>
                            <Select value={planDuration.toString()} onValueChange={(value) => setPlanDuration(parseInt(value))}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(months => (
                                        <SelectItem key={months} value={months.toString()}>
                                            {formatDuration(months)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-plan-panel">Painel</Label>
                            <Select value={planPanelId} onValueChange={setPlanPanelId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione um painel" />
                                </SelectTrigger>
                                <SelectContent>
                                    {panels?.map(panel => (
                                        <SelectItem key={panel.id} value={panel.id}>
                                            {panel.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter className="flex flex-col sm:flex-row gap-3">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsEditPlanDialogOpen(false);
                                resetPlanForm();
                                setEditingPlan(null);
                            }}
                            className="w-full sm:w-auto"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleUpdatePlan}
                            className="w-full sm:w-auto bg-gradient-to-r from-orange-600 to-red-700 hover:from-orange-700 hover:to-red-800"
                        >
                            <Edit className="mr-2 h-4 w-4" />
                            Salvar Alterações
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}


