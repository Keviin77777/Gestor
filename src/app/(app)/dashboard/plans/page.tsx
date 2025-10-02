"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreVertical, Edit, Trash2 } from "lucide-react";
import { panels, plans } from "@/lib/data";
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
    const [isPanelDialogOpen, setIsPanelDialogOpen] = useState(false);

    return (
        <Tabs defaultValue="panels" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="panels">Painéis</TabsTrigger>
                <TabsTrigger value="plans">Planos</TabsTrigger>
            </TabsList>
            <TabsContent value="panels">
                 <Dialog open={isPanelDialogOpen} onOpenChange={setIsPanelDialogOpen}>
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle>Seus Painéis</CardTitle>
                                <DialogTrigger asChild>
                                    <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Adicionar Painel</Button>
                                </DialogTrigger>
                            </div>
                            <CardDescription>Gerencie seus painéis de IPTV e seus custos.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                            {panels.map(panel => (
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
                                                <DropdownMenuItem>
                                                    <Edit className="mr-2 h-4 w-4" />
                                                    Editar
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="text-destructive focus:text-destructive">
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
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                        <DialogTitle>Adicionar Novo Painel</DialogTitle>
                        <DialogDescription>
                            Preencha as informações do novo painel.
                        </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="panel-name" className="text-right">Nome</Label>
                                <Input id="panel-name" placeholder="Ex: Painel Principal" className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="panel-cost" className="text-right">Custo Mensal</Label>
                                <Input id="panel-cost" type="number" placeholder="Ex: 150.00" className="col-span-3" />
                            </div>
                        </div>
                        <DialogFooter>
                        <Button type="submit" onClick={() => setIsPanelDialogOpen(false)}>Salvar</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
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
    );
}
