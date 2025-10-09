"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PlusCircle, DollarSign, Calendar, Trash2, Edit, RefreshCw, Server, MoreVertical } from "lucide-react";

// Removed Firebase Firestore imports;
// Removed useCollection - using direct API calls;
import { mysqlApi } from '@/lib/mysql-api-client';
import type { Expense, Panel, Client, Plan } from "@/lib/definitions";
import { format } from "date-fns";
import { useClients } from '@/hooks/use-clients';
import { usePlans } from '@/hooks/use-plans';
import { usePanels } from '@/hooks/use-panels';

import { useMySQL } from '@/lib/mysql-provider';

export default function ExpensesPage() {
    const { user } = useMySQL();
    const resellerId = user?.id;
    
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [description, setDescription] = useState("");
    const [value, setValue] = useState("");
    const [type, setType] = useState<"fixed" | "variable">("fixed");
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    // Collections

    const [expenses, setExpenses] = React.useState<any[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);

    // Load expenses
    React.useEffect(() => {
        const loadExpenses = async () => {
            if (!resellerId) return;
            try {
                setIsLoading(true);
                const data = await mysqlApi.getExpenses();
                setExpenses(data);
            } catch (error) {
                console.error('Error loading expenses:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadExpenses();
    }, [resellerId]);
    const { data: panels, isLoading: panelsLoading } = usePanels();
    const { data: clients, isLoading: clientsLoading } = useClients();
    const { data: plans, isLoading: plansLoading } = usePlans();

    // Calculate automatic panel expenses
    const panelExpenses = useMemo(() => {
        if (!panels || !clients || !plans) return [];

        return panels.map(panel => {
            // Find plans for this panel
            const panelPlans = plans.filter(plan => plan.panel_id === panel.id);
            
            // Find active clients using plans from this panel
            const activeClientsInPanel = clients.filter(client => 
                client.status === 'active' && 
                panelPlans.some(plan => plan.id === client.plan_id)
            );

            // Use monthly_cost from panel
            const cost = panel.monthly_cost || 0;

            return {
                panel,
                activeClients: activeClientsInPanel.length,
                cost,
                description: `Painel ${panel.name} - ${activeClientsInPanel.length} clientes ativos`
            };
        });
    }, [panels, clients, plans]);

    // Auto-generate panel expenses
    const generatePanelExpenses = async () => {
        if (!resellerId) return;

        const today = format(new Date(), 'yyyy-MM-dd');
        
        for (const panelExpense of panelExpenses) {
            if (panelExpense.cost > 0) {
                const expense: Partial<Expense> = {
                    reseller_id: resellerId,
                    date: today,
                    value: panelExpense.cost,
                    type: 'fixed',
                    description: panelExpense.description
                };
                
                await mysqlApi.createExpense(expense);
            }
        }
    };

    const handleAddExpense = async () => {
        if (!resellerId) return;
        if (!description.trim() || !value.trim()) {
            alert('Preencha todos os campos obrigatórios.');
            return;
        }

        const expense: Partial<Expense> = {
            reseller_id: resellerId,
            date,
            value: parseFloat(value),
            type,
            description: description.trim()
        };

        const created = await mysqlApi.createExpense(expense);
        // Atualiza a lista imediatamente
        setExpenses(prev => [created as any, ...prev]);
        
        // Reset form
        setDescription("");
        setValue("");
        setType("fixed");
        setDate(format(new Date(), 'yyyy-MM-dd'));
        setIsDialogOpen(false);
    };

    const handleDeleteExpense = async (expenseId: string, expenseDescription: string) => {
        if (!resellerId) {
            alert('Erro: usuário não autenticado.');
            return;
        }

        const confirmDelete = window.confirm(`Tem certeza que deseja excluir a despesa "${expenseDescription}"? Esta ação não pode ser desfeita.`);
        if (!confirmDelete) return;

        try {
            await mysqlApi.deleteExpense(expenseId);
            // Remove imediatamente da lista
            setExpenses(prev => prev.filter((e: any) => e.id !== expenseId));
        } catch (error) {
            console.error('Error deleting expense:', error);
        }
    };

    const resetForm = () => {
        setDescription("");
        setValue("");
        setType("fixed");
        setDate(format(new Date(), 'yyyy-MM-dd'));
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="space-y-4">
                <div className="space-y-2">
                    <h1 className="text-4xl font-headline font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
                        Gestão de Despesas
                    </h1>
                    <p className="text-lg text-slate-600 dark:text-slate-400">
                        Controle suas despesas fixas e variáveis
                    </p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Button 
                            onClick={generatePanelExpenses}
                            variant="outline"
                            className="bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-blue-700 border-blue-200"
                        >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Gerar Despesas dos Painéis
                        </Button>
                    </div>
                    <Button 
                        onClick={() => setIsDialogOpen(true)}
                        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Adicionar Despesa
                    </Button>
                </div>
            </div>

            {/* Panel Expenses Preview */}
            {panelExpenses.length > 0 && (
                <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                            <Server className="h-5 w-5" />
                            Despesas Automáticas dos Painéis
                        </CardTitle>
                        <CardDescription className="text-blue-600 dark:text-blue-400">
                            Custos calculados automaticamente baseados nos clientes ativos
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {panelExpenses.map((panelExpense, index) => (
                                <div key={index} className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-blue-200 dark:border-blue-800">
                                    <div className="space-y-2">
                                        <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                                            {panelExpense.panel.name}
                                        </h4>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-600 dark:text-slate-400">Clientes Ativos:</span>
                                            <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                                                {panelExpense.activeClients}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-600 dark:text-slate-400">Custo:</span>
                                            <span className="font-semibold text-green-600 dark:text-green-400">
                                                R$ {(Number(panelExpense.cost) || 0).toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">
                                            Custo Mensal: R$ {(Number(panelExpense.panel.monthly_cost) || 0).toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Expenses Table */}
            <Card className="border-0 shadow-xl">
                <CardHeader>
                    <CardTitle className="text-xl font-headline font-bold">Histórico de Despesas</CardTitle>
                    <CardDescription>Todas as despesas registradas no sistema</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-b border-border/50">
                                    <TableHead className="font-semibold">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4" />
                                            Data
                                        </div>
                                    </TableHead>
                                    <TableHead className="font-semibold">Descrição</TableHead>
                                    <TableHead className="font-semibold text-center">Tipo</TableHead>
                                    <TableHead className="font-semibold text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <DollarSign className="h-4 w-4" />
                                            Valor
                                        </div>
                                    </TableHead>
                                    <TableHead className="font-semibold text-center w-20">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-12">
                                            <div className="flex flex-col items-center space-y-2">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                                <p className="text-muted-foreground">Carregando despesas...</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                                {expenses?.map((expense) => (
                                    <TableRow key={expense.id} className="hover:bg-muted/50 transition-colors">
                                        <TableCell className="font-medium">
                                            {(() => {
                                                const [year, month, day] = expense.date.split('-');
                                                return `${day}/${month}/${year}`;
                                            })()}
                                        </TableCell>
                                        <TableCell className="font-medium">{expense.description}</TableCell>
                                        <TableCell className="text-center">
                                            <Badge 
                                                variant={expense.type === 'fixed' ? 'secondary' : 'outline'}
                                                className={expense.type === 'fixed' 
                                                    ? 'bg-blue-100 text-blue-800 border-blue-200' 
                                                    : 'bg-orange-100 text-orange-800 border-orange-200'
                                                }
                                            >
                                                {expense.type === 'fixed' ? 'Fixa' : 'Variável'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="text-lg font-semibold text-red-600 dark:text-red-400">
                                                R$ {expense.value.toFixed(2)}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem 
                                                        onClick={() => handleDeleteExpense(expense.id, expense.description)}
                                                        className="text-red-600 focus:text-red-600 cursor-pointer"
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Excluir
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {!isLoading && (!expenses || expenses.length === 0) && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-12">
                                            <div className="flex flex-col items-center space-y-4">
                                                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                                                    <DollarSign className="h-8 w-8 text-muted-foreground" />
                                                </div>
                                                <div>
                                                    <p className="text-lg font-medium">Nenhuma despesa encontrada</p>
                                                    <p className="text-muted-foreground">Comece adicionando sua primeira despesa</p>
                                                </div>
                                                <Button onClick={() => setIsDialogOpen(true)}>
                                                    <PlusCircle className="mr-2 h-4 w-4" />
                                                    Adicionar Despesa
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Add Expense Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader className="space-y-3">
                        <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                <PlusCircle className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-semibold">Adicionar Nova Despesa</DialogTitle>
                                <DialogDescription className="text-sm text-muted-foreground">
                                    Registre uma nova despesa no sistema
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>
                    
                    <div className="space-y-6 py-4">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="description" className="text-sm font-medium">Descrição</Label>
                                <Textarea
                                    id="description"
                                    placeholder="Descreva a despesa..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="min-h-[80px]"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="value" className="text-sm font-medium">Valor (R$)</Label>
                                    <Input
                                        id="value"
                                        type="number"
                                        step="0.01"
                                        placeholder="0,00"
                                        value={value}
                                        onChange={(e) => setValue(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="date" className="text-sm font-medium">Data</Label>
                                    <Input
                                        id="date"
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Tipo de Despesa</Label>
                                <Select value={type} onValueChange={(value: "fixed" | "variable") => setType(value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o tipo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="fixed">Fixa</SelectItem>
                                        <SelectItem value="variable">Variável</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleAddExpense} className="bg-gradient-to-r from-blue-600 to-blue-700">
                            Adicionar Despesa
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

