import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { OverviewChart } from "@/components/dashboard/overview-chart";
import { CalendarDateRangePicker } from "@/components/reports/date-range-picker";

export default function ReportsPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-4">
                <h1 className="text-2xl font-bold font-headline">Relatórios Financeiros</h1>
                <div className="flex items-center gap-2">
                    <CalendarDateRangePicker />
                    <Button>
                        <Download className="mr-2 h-4 w-4" />
                        Exportar
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle>Receita Bruta</CardTitle>
                        <CardDescription>Período selecionado</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">R$ 15,280.40</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Despesas Totais</CardTitle>
                        <CardDescription>Período selecionado</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">R$ 2,150.00</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Lucro Líquido</CardTitle>
                        <CardDescription>Período selecionado</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-green-600">R$ 13,130.40</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Comparativo Mensal</CardTitle>
                    <CardDescription>Lucro líquido ao longo do tempo.</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                    <OverviewChart />
                </CardContent>
            </Card>
        </div>
    )
}
