"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreVertical, Edit, Trash2 } from "lucide-react";
import { panels, plans } from "@/lib/data";
import type { Panel } from "@/lib/definitions";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function PlansAndPanelsPage() {
    const [panelList, setPanelList] = useState<Panel[]>(panels);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [selectedPanel, setSelectedPanel] = useState<Panel | null>(null);
    const [panelName, setPanelName] = useState("");
    const [panelCost, setPanelCost] = useState("");

    const handleAddPanel = () => {
        if (!panelName || !panelCost) return;
        const newPanel: Panel = {
            id: `p${panelList.length + 1}`,
            name: panelName,
            monthlyCost: parseFloat(panelCost),
            // Setting default values for fields not in the form
            type: 'XUI', 
            login: 'admin'
        };
        setPanelList([...panelList, newPanel]);
        setIsAddDialogOpen(false);
        setPanelName("");
        setPanelCost("");
    };

    const handleEditPanel = () => {
        if (!selectedPanel || !panelName || !panelCost) return;

        setPanelList(panelList.map(p =>
            p.id === selectedPanel.id
                ? { ...p, name: panelName, monthlyCost: parseFloat(panelCost) }
                : p
        ));
        setIsEditDialogOpen(false);
        setSelectedPanel(null);
        setPanelName("");
        setPanelCost("");
    };
    
    const openEditDialog = (panel: Panel) => {
        setSelectedPanel(panel);
        setPanelName(panel.name);
        setPanelCost(panel.monthlyCost.toString());
        setIsEditDialogOpen(true);
    };

    const handleRemovePanel = (panelId: string) => {
        setPanelList(panelList.filter(p => p.id !== panelId));
    };


    return (
        <>
            <Tabs defaultValue="panels" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="panels">Painéis</TabsTrigger>
                    <TabsTrigger value="plans">Planos</TabsTrigger>
                </TabsList>
                <TabsContent value="panels">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle>Seus Painéis</CardTitle>
                                <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Painel
                                </Button>
                            </div>
                            <CardDescription>Gerencie seus painéis de IPTV e seus custos.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                            {panelList.map(panel => (
                                <Card key={panel.id}>
                                    <CardHeader className="flex flex-row items-start justify-between">
                                        <CardTitle>{panel.name}</CardTitle>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => openEditDialog(panel)}>
                                                    <Edit className="mr-2 h-4 w-4" />
                                                    Editar
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleRemovePanel(panel.id)} className="text-destructive focus:text-destructive">
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Remover
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-lg font-semibold">Custo: R$ {panel.monthlyCost.toFixed(2)}/mês</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="plans">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle>Seus Planos</CardTitle>
                                <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Adicionar Plano</Button>
                            </div>
                            <CardDescription>Gerencie os planos que você oferece aos clientes.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {plans.map(plan => (
                                <Card key={plan.id}>
                                    <CardHeader>
                                        <CardTitle>{plan.name}</CardTitle>
                                        <CardDescription>Duração: {plan.duration === 'monthly' ? 'Mensal' : plan.duration === 'quarterly' ? 'Trimestral' : 'Anual'}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-lg font-semibold">Valor: R$ {plan.value.toFixed(2)}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
            
            {/* Add Panel Dialog */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                    <DialogTitle>Adicionar Novo Painel</DialogTitle>
                    <DialogDescription>
                        Preencha as informações do novo painel.
                    </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="panel-name-add" className="text-right">Nome</Label>
                            <Input id="panel-name-add" value={panelName} onChange={(e) => setPanelName(e.target.value)} placeholder="Ex: Painel Principal" className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="panel-cost-add" className="text-right">Custo Mensal</Label>
                            <Input id="panel-cost-add" type="number" value={panelCost} onChange={(e) => setPanelCost(e.target.value)} placeholder="Ex: 150.00" className="col-span-3" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleAddPanel}>Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Panel Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                    <DialogTitle>Editar Painel</DialogTitle>
                    <DialogDescription>
                        Atualize as informações do painel.
                    </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="panel-name-edit" className="text-right">Nome</Label>
                            <Input id="panel-name-edit" value={panelName} onChange={(e) => setPanelName(e.target.value)} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="panel-cost-edit" className="text-right">Custo Mensal</Label>
                            <Input id="panel-cost-edit" type="number" value={panelCost} onChange={(e) => setPanelCost(e.target.value)} className="col-span-3" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleEditPanel}>Salvar Alterações</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
