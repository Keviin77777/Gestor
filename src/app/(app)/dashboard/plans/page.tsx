"use client";

import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreVertical, Edit, Trash2, CalendarIcon } from "lucide-react";
import type { Panel, Plan } from "@/lib/definitions";
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
import { useAuth, useFirebase, useMemoFirebase } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { useCollection } from "@/firebase/firestore/use-collection";
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";

export default function PlansAndPanelsPage() {
    const { firestore } = useFirebase();
    const { user } = useAuth();

    const resellerId = user?.uid;

    const panelsCollection = useMemoFirebase(() => {
        if (!resellerId) return null;
        return collection(firestore, 'resellers', resellerId, 'panels');
    }, [firestore, resellerId]);

    const plansCollection = useMemoFirebase(() => {
        if (!resellerId) return null;
        return collection(firestore, 'resellers', resellerId, 'plans');
    }, [firestore, resellerId]);

    const { data: panelList, isLoading: panelsLoading } = useCollection<Panel>(panelsCollection);
    const { data: plans, isLoading: plansLoading } = useCollection<Plan>(plansCollection);

    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [selectedPanel, setSelectedPanel] = useState<Panel | null>(null);

    const [panelName, setPanelName] = useState("");
    const [renewalDate, setRenewalDate] = useState<Date | undefined>();
    const [costType, setCostType] = useState<'fixed' | 'perActive'>('fixed');
    const [monthlyCost, setMonthlyCost] = useState("");
    const [costPerActive, setCostPerActive] = useState("");
    const [panelType, setPanelType] = useState<'XUI' | 'Xtream' | 'Other'>('XUI');
    const [panelLogin, setPanelLogin] = useState("");


    const resetForm = () => {
        setPanelName("");
        setRenewalDate(undefined);
        setCostType("fixed");
        setMonthlyCost("");
        setCostPerActive("");
        setPanelType("XUI");
        setPanelLogin("");
        setSelectedPanel(null);
    };
    
    const handleOpenAddDialog = () => {
        resetForm();
        setIsAddDialogOpen(true);
    }

    const handleAddPanel = () => {
        if (!panelsCollection || !resellerId) return;

        const newPanelData: Partial<Panel> = {
            resellerId,
            name: panelName,
            renewalDate: renewalDate ? format(renewalDate, "yyyy-MM-dd") : '',
            costType: costType,
            monthlyCost: costType === 'fixed' ? parseFloat(monthlyCost) || 0 : undefined,
            costPerActive: costType === 'perActive' ? parseFloat(costPerActive) || 0 : undefined,
            type: panelType, 
            login: panelLogin
        };
        addDocumentNonBlocking(panelsCollection, newPanelData);
        setIsAddDialogOpen(false);
    };
    
    const openEditDialog = (panel: Panel) => {
        setSelectedPanel(panel);
        setPanelName(panel.name);
        setRenewalDate(panel.renewalDate ? new Date(panel.renewalDate) : undefined);
        setCostType(panel.costType);
        setMonthlyCost(panel.monthlyCost?.toString() || "");
        setCostPerActive(panel.costPerActive?.toString() || "");
        setPanelType(panel.type);
        setPanelLogin(panel.login);
        setIsEditDialogOpen(true);
    };

    const handleEditPanel = () => {
        if (!selectedPanel || !resellerId || !firestore) return;

        const panelRef = doc(firestore, 'resellers', resellerId, 'panels', selectedPanel.id);
        
        const updatedData: Partial<Panel> = { 
            name: panelName,
            renewalDate: renewalDate ? format(renewalDate, "yyyy-MM-dd") : selectedPanel.renewalDate,
            costType: costType,
            monthlyCost: costType === 'fixed' ? parseFloat(monthlyCost) || 0 : undefined,
            costPerActive: costType === 'perActive' ? parseFloat(costPerActive) || 0 : undefined,
            type: panelType,
            login: panelLogin,
          };

        updateDocumentNonBlocking(panelRef, updatedData);
        setIsEditDialogOpen(false);
        setSelectedPanel(null);
    };

    const handleRemovePanel = (panelId: string) => {
        if (!resellerId || !firestore) return;
        const panelRef = doc(firestore, 'resellers', resellerId, 'panels', panelId);
        deleteDocumentNonBlocking(panelRef);
    };

    const renderCost = (panel: Panel) => {
        if (panel.costType === 'fixed') {
            return `R$ ${panel.monthlyCost?.toFixed(2)}/mês`;
        }
        if (panel.costType === 'perActive' && panel.costPerActive) {
             const activeClients = panel.activeClients || 0; // Replace with actual logic later
            const total = panel.costPerActive * activeClients;
            return `R$ ${total.toFixed(2)}/mês (R$ ${panel.costPerActive.toFixed(2)}/ativo)`;
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
                <Label htmlFor="panel-type" className="text-right">Login</Label>
                <Input id="panel-login" value={panelLogin} onChange={(e) => setPanelLogin(e.target.value)} placeholder="Ex: admin" className="col-span-3" />
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
                            {panelsLoading && <p>Carregando painéis...</p>}
                            {panelList?.map(panel => (
                                <Card key={panel.id}>
                                    <CardHeader className="flex flex-row items-start justify-between pb-2">
                                        <div>
                                            <CardTitle>{panel.name}</CardTitle>
                                            <CardDescription>Vence em: {panel.renewalDate ? format(new Date(panel.renewalDate), "dd/MM/yyyy") : 'N/A'}</CardDescription>
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
                                        {panel.costType === 'perActive' && <p className="text-sm text-muted-foreground">{panel.activeClients || 0} clientes ativos</p>}
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
                             {plansLoading && <p>Carregando planos...</p>}
                            {plans?.map(plan => (
                                <Card key={plan.id}>
                                    <CardHeader>
                                        <CardTitle>{plan.name}</CardTitle>
                                        <CardDescription>Duração: {plan.duration === 'monthly' ? 'Mensal' : plan.duration === 'quarterly' ? 'Trimestral' : 'Anual'}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-lg font-semibold">Valor: R$ {plan.saleValue.toFixed(2)}</p>
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
                    </Header>
                    {FormFields}
                    <DialogFooter>
                        <Button onClick={handleEditPanel}>Salvar Alterações</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
