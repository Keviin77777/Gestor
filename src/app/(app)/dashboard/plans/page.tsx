"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, MoreVertical, Edit, Trash2, CalendarIcon, Search, Filter, Grid, List, Eye } from "lucide-react";
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
import { useFirebase, useMemoFirebase } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { useCollection } from "@/firebase/firestore/use-collection";
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function PlansPage() {
    const { firestore, user } = useFirebase();
    const resellerId = user?.uid;

    const panelsCollection = useMemoFirebase(() => {
        if (!resellerId) return null;
        return collection(firestore, 'resellers', resellerId, 'panels');
    }, [firestore, resellerId]);

    const plansCollection = useMemoFirebase(() => {
        if (!resellerId) return null;
        return collection(firestore, 'resellers', resellerId, 'plans');
    }, [firestore, resellerId]);

    const clientsCollection = useMemoFirebase(() => {
        if (!resellerId) return null;
        return collection(firestore, 'resellers', resellerId, 'clients');
    }, [firestore, resellerId]);

    const { data: panels } = useCollection<Panel>(panelsCollection);
    const { data: plans, isLoading: plansLoading } = useCollection<Plan>(plansCollection);
    const { data: clients } = useCollection<Client>(clientsCollection);

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

    const formatDuration = (months: number) => {
        // Verificar se months é um número válido
        if (!months || isNaN(months) || months <= 0) return '1 mês';
        
        if (months === 1) return '1 mês';
        if (months < 12) return `${months} meses`;
        
        const years = Math.floor(months / 12);
        const remainingMonths = months % 12;
        
        if (remainingMonths === 0) {
            return years === 1 ? '1 ano' : `${years} anos`;
        }
        
        return `${years} ano${years > 1 ? 's' : ''} e ${remainingMonths} mês${remainingMonths > 1 ? 'es' : ''}`;
    };

    const getActiveClientsForPlan = (planId: string) => {
        return clients?.filter(client => client.planId === planId && client.status === 'active').length || 0;
    };

    // Filtered and sorted plans
    const filteredAndSortedPlans = useMemo(() => {
        if (!plans) return [];

        let filtered = plans.filter(plan => {
            const matchesSearch = plan.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesPanel = filterPanel === 'all' || plan.panelId === filterPanel;
            const matchesDuration = filterDuration === 'all' || 
                (filterDuration === '1-3' && plan.duration >= 1 && plan.duration <= 3) ||
                (filterDuration === '4-6' && plan.duration >= 4 && plan.duration <= 6) ||
                (filterDuration === '7-12' && plan.duration >= 7 && plan.duration <= 12);
            
            return matchesSearch && matchesPanel && matchesDuration;
        });

        // Sort plans
        filtered.sort((a, b) => {
            let aValue: any, bValue: any;
            
            switch (sortBy) {
                case 'name':
                    aValue = a.name.toLowerCase();
                    bValue = b.name.toLowerCase();
                    break;
                case 'price':
                    aValue = a.saleValue;
                    bValue = b.saleValue;
                    break;
                case 'duration':
                    aValue = a.duration;
                    bValue = b.duration;
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

        return filtered;
    }, [plans, searchTerm, filterPanel, filterDuration, sortBy, sortOrder, clients]);

    const handleAddPlan = () => {
        if (!plansCollection || !resellerId) {
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

        const newPlan: Omit<Plan, 'id'> = {
            resellerId,
            panelId: planPanelId,
            name: planName.trim(),
            saleValue: parseFloat(planSaleValue.replace(',', '.')),
            duration: planDuration,
        };

        addDocumentNonBlocking(plansCollection, newPlan);
        resetPlanForm();
        setIsAddPlanDialogOpen(false);
    };

    const handleEditPlan = (plan: Plan) => {
        setEditingPlan(plan);
        setPlanName(plan.name);
        // Formatar o valor corretamente para edição - manter como string com ponto para input number
        setPlanSaleValue(plan.saleValue.toFixed(2));
        setPlanDuration(plan.duration || 1);
        setPlanPanelId(plan.panelId);
        setIsEditPlanDialogOpen(true);
    };

    const handleUpdatePlan = () => {
        if (!editingPlan || !plansCollection || !resellerId) {
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
            saleValue: parseFloat(planSaleValue.replace(',', '.')),
            duration: planDuration,
            panelId: planPanelId,
        };

        const planRef = doc(firestore, 'resellers', resellerId, 'plans', editingPlan.id);
        updateDocumentNonBlocking(planRef, updatedPlan);
        resetPlanForm();
        setIsEditPlanDialogOpen(false);
        setEditingPlan(null);
    };

    const handleDeletePlan = async (plan: Plan) => {
        if (!plansCollection || !resellerId) {
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

        const planRef = doc(firestore, 'resellers', resellerId, 'plans', plan.id);
        deleteDocumentNonBlocking(planRef);
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
                                {filteredAndSortedPlans.length > 0 && (
                                    <Badge variant="secondary" className="ml-2">
                                        {filteredAndSortedPlans.length}
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

                    {/* Table View */}
                    {!plansLoading && viewMode === 'table' && (
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
                                        <TableHead>Servidor</TableHead>
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
                                    {filteredAndSortedPlans.map(plan => (
                                        <TableRow key={plan.id} className="hover:bg-muted/50">
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                                        <span className="text-white font-bold text-xs">
                                                            {plan.name.charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <div className="font-medium">{plan.name}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-semibold text-green-600">
                                                    R$ {plan.saleValue.toFixed(2).replace('.', ',')}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="font-medium">
                                                    {formatDuration(plan.duration)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">
                                                    {panels?.find(p => p.id === plan.panelId)?.name || 'N/A'}
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
                    )}

                    {/* Grid View */}
                    {!plansLoading && viewMode === 'grid' && (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {filteredAndSortedPlans.map(plan => (
                                <Card key={plan.id} className="group relative overflow-hidden border-0 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                                    <CardHeader className="pb-4">
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                                                        <span className="text-white font-bold text-sm">
                                                            {plan.name.charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                                                            {plan.name}
                                                        </CardTitle>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <CalendarIcon className="h-3 w-3 text-slate-500" />
                                                            <span className="text-xs text-slate-500 font-medium">
                                                                {formatDuration(plan.duration)}
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
                                        {/* Valor em destaque */}
                                        <div className="text-center py-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200/50 dark:border-green-800/50">
                                            <div className="text-xs text-green-600 dark:text-green-400 font-medium uppercase tracking-wide mb-1">
                                                Valor Mensal
                                            </div>
                                            <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                                                R$ {plan.saleValue.toFixed(2).replace('.', ',')}
                                            </div>
                                        </div>

                                        {/* Informações do plano */}
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Servidor</span>
                                                <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200">
                                                    {panels?.find(p => p.id === plan.panelId)?.name || 'N/A'}
                                                </Badge>
                                            </div>
                                            
                                            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Clientes Ativos</span>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                                    <span className="font-bold text-blue-600 dark:text-blue-400">
                                                        {getActiveClientsForPlan(plan.id)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Ações rápidas */}
                                        <div className="flex gap-2 pt-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleEditPlan(plan)}
                                                className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800"
                                            >
                                                <Edit className="mr-2 h-3 w-3" />
                                                Editar
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleDeletePlan(plan)}
                                                className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-300 dark:border-red-800"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                    
                                    {/* Decorative elements */}
                                    <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-blue-400/10 to-purple-500/10 group-hover:scale-110 transition-transform duration-500"></div>
                                    <div className="absolute -left-4 -bottom-4 h-16 w-16 rounded-full bg-gradient-to-br from-green-400/10 to-blue-500/10 group-hover:scale-110 transition-transform duration-500"></div>
                                </Card>
                            ))}
                        </div>
                    )}

                    {/* Empty State */}
                    {!plansLoading && filteredAndSortedPlans.length === 0 && (
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