import { Bell, AlertTriangle, Info } from "lucide-react";
import { smartRenewalNotifications, SmartRenewalNotificationsInput } from "@/ai/flows/smart-renewal-notifications";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { format } from 'date-fns';

async function getNotifications() {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    const inTwoWeeks = new Date(today);
    inTwoWeeks.setDate(today.getDate() + 14);


    const mockInput: SmartRenewalNotificationsInput = {
        clientsExpiringSoon: [
            { clientId: 'c001', clientName: 'João da Silva', planName: 'Premium Mensal', renewalDate: format(nextWeek, 'yyyy-MM-dd') },
            { clientId: 'c002', clientName: 'Maria Antônia', planName: 'Básico', renewalDate: format(inTwoWeeks, 'yyyy-MM-dd') }
        ],
        panelsNeedingRenewal: [
            { panelId: 'p01', panelName: 'Painel XUI Principal', renewalDate: format(nextWeek, 'yyyy-MM-dd') }
        ]
    };

    try {
        const result = await smartRenewalNotifications(mockInput);
        return result.notifications;
    } catch (error) {
        console.error("Error fetching smart notifications:", error);
        return ["Erro ao gerar notificações. Tente novamente mais tarde."];
    }
}

export async function SmartNotifications() {
    const notifications = await getNotifications();

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Notificações Inteligentes
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="space-y-3">
                    {notifications.map((note, index) => {
                        const isUrgent = note.toLowerCase().includes('urgent');
                        const isAlert = note.toLowerCase().includes('alert');
                        return (
                            <li key={index} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 border">
                                {isUrgent ? (
                                    <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                                ) : isAlert ? (
                                    <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                                ) : (
                                    <Info className="h-5 w-5 text-primary mt-0.5" />
                                )}
                                <p className="text-sm text-secondary-foreground">{note}</p>
                            </li>
                        );
                    })}
                     {!notifications.length && <p className="text-sm text-muted-foreground">Nenhum aviso no momento.</p>}
                </ul>
            </CardContent>
        </Card>
    );
}
