import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { panels, plans } from "@/lib/data";

export default function PlansAndPanelsPage() {
    return (
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
                            <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Adicionar Painel</Button>
                        </div>
                        <CardDescription>Gerencie seus painéis de IPTV e seus custos.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                        {panels.map(panel => (
                             <Card key={panel.id}>
                                <CardHeader>
                                    <CardTitle>{panel.name}</CardTitle>
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
    );
}
