"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreVertical, Edit, Trash2, CalendarIcon } from "lucide-react";
import { panels, plans, clients } from "@/lib/data";
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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PlansAndPanelsPage() {
    const [panelList, setPanelList] = useState<Panel[]>(panels.map(p => ({...p, activeClients: p.costType === 'perActive' ? clients.length : undefined })));
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [selectedPanel, setSelectedPanel] = useState<Panel | null>(null);

    // Form state
    const [panelName, setPanelName] = useState("");
    const [renewalDate, setRenewalDate] = useState<Date | undefined>();
    const [costType, setCostType] = useState<'fixed' | 'perActive'>('fixed');
    const [monthlyCost, setMonthlyCost] = useState("");
    const [costPerActive, setCostPerActive] = useState("");

    const resetForm = () => {
        setPanelName("");
        setRenewalDate(undefined);
        setCostType("fixed");
        setMonthlyCost("");
        setCostPerActive("");
    };
    
    const handleOpenAddDialog = () => {
        resetForm();
        setIsAddDialogOpen(true);
    }

    const handleAddPanel = () => {
        const newPanel: Panel = {
            id: `p${panelList.length + 1}`,
            name: panelName,
            renewalDate: renewalDate ? format(renewalDate, "yyyy-MM-dd") : '',
            costType: costType,
            monthlyCost: costType === 'fixed' ? parseFloat(monthlyCost) : undefined,
            costPerActive: costType === 'perActive' ? parseFloat(costPerActive) : undefined,
            activeClients: costType === 'perActive' ? clients.length : undefined,
            // Setting default values for fields not in the form
            type: 'XUI', 
            login: 'admin'
        };
        setPanelList([...panelList, newPanel]);
        setIsAddDialogOpen(false);
    };
    
    const openEditDialog = (panel: Panel) => {
        setSelectedPanel(panel);
        setPanelName(panel.name);
        setRenewalDate(new Date(panel.renewalDate));
        setCostType(panel.costType);
        setMonthlyCost(panel.monthlyCost?.toString() || "");
        setCostPerActive(panel.costPerActive?.toString() || "");
        setIsEditDialogOpen(true);
    };

    const handleEditPanel = () => {
        if (!selectedPanel) return;

        setPanelList(panelList.map(p =>
            p.id === selectedPanel.id
                ? { 
                    ...p, 
                    name: panelName,
                    renewalDate: renewalDate ? format(renewalDate, "yyyy-MM-dd") : p.renewalDate,
                    costType: costType,
                    monthlyCost: costType === 'fixed' ? parseFloat(monthlyCost) : undefined,
                    costPerActive: costType === 'perActive' ? parseFloat(costPerActive) : undefined,
                    activeClients: costType === 'perActive' ? clients.length : p.activeClients,
                  }
                : p
        ));
        setIsEditDialogOpen(false);
        setSelectedPanel(null);
    };

    const handleRemovePanel = (panelId: string) => {
        setPanelList(panelList.filter(p => p.id !== panelId));
    };

    const renderCost = (panel: Panel) => {
        if (panel.costType === 'fixed') {
            return `R$ ${panel.monthlyCost?.toFixed(2)}/mês`;
        }
        if (panel.costType === 'perActive') {
            const total = (panel.costPerActive || 0) * (panel.activeClients || 0);
            return `R$ ${total.toFixed(2)}/mês (R$ ${panel.costPerActive?.toFixed(2)}/ativo)`;
        }
        return 'N/A';
    }
    
    const FormFields = (
        <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="panel-name" className="text-right">Nome</Label>
                <Input id="panel-name" value={panelName} onChange={(e) => setPanelName(e.target.value)} placeholder="Ex: Painel Principal" className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="renewal-date" className="text-right">Vencimento</Label>
                <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className={cn(
                        "col-span-3 justify-start text-left font-normal",
                        !renewalDate && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {renewalDate ? format(renewalDate, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                    <Calendar
                        mode="single"
                        selected={renewalDate}
                        onSelect={setRenewalDate}
                        initialFocus
                        locale={ptBR}
                    />
                    </PopoverContent>
                </Popover>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">Tipo de Custo</Label>
                <RadioGroup value={costType} onValueChange={(value) => setCostType(value as 'fixed' | 'perActive')} className="col-span-3 flex flex-col space-y-2">
                     <div className="flex items-center space-x-2">
                        <RadioGroupItem value="fixed" id="fixed" />
                        <Label htmlFor="fixed">Fixo</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="perActive" id="perActive" />
                        <Label htmlFor="perActive">Por Ativo</Label>
                    </div>
                </RadioGroup>
            </div>
            {costType === 'fixed' && (
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="monthly-cost" className="text-right">Custo Mensal</Label>
                    <Input id="monthly-cost" type="number" value={monthlyCost} onChange={(e) => setMonthlyCost(e.target.value)} placeholder="Ex: 150.00" className="col-span-3" />
                </div>
            )}
            {costType === 'perActive' && (
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="cost-per-active" className="text-right">Custo por Ativo</Label>
                    <Input id="cost-per-active" type="number" value={costPerActive} onChange={(e) => setCostPerActive(e.target.value)} placeholder="Ex: 5.00" className="col-span-3" />
                </div>
            )}
        </div>
    );


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
                                <Button size="sm" onClick={handleOpenAddDialog}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Painel
                                </Button>
                            </div>
                            <CardDescription>Gerencie seus painéis de IPTV, que funcionam como suas franquias.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                            {panelList.map(panel => (
                                <Card key={panel.id}>
                                    <CardHeader className="flex flex-row items-start justify-between pb-2">
                                        <div>
                                            <CardTitle>{panel.name}</CardTitle>
                                            <CardDescription>Vence em: {format(new Date(panel.renewalDate), "dd/MM/yyyy")}</CardDescription>
                                        </div>
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
                                        <p className="text-lg font-semibold">{renderCost(panel)}</p>
                                        {panel.costType === 'perActive' && <p className="text-sm text-muted-foreground">{panel.activeClients} clientes ativos</p>}
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
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                    <DialogTitle>Adicionar Novo Painel</DialogTitle>
                    <DialogDescription>
                        Preencha as informações do novo painel.
                    </DialogDescription>
                    </DialogHeader>
                    {FormFields}
                    <DialogFooter>
                        <Button onClick={handleAddPanel}>Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Panel Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                    <DialogTitle>Editar Painel</DialogTitle>
                    <DialogDescription>
                        Atualize as informações do painel.
                    </DialogDescription>
                    </DialogHeader>
                    {FormFields}
                    <DialogFooter>
                        <Button onClick={handleEditPanel}>Salvar Alterações</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
