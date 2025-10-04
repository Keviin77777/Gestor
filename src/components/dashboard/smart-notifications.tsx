"use client";

import { Bell, AlertTriangle, Info, Clock, CheckCircle2, Calendar, CreditCard } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, differenceInDays, parseISO, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEffect, useState } from 'react';
import { useFirebase, useMemoFirebase } from "@/firebase";
import { useCollection } from "@/firebase/firestore/use-collection";
import { collection } from "firebase/firestore";
import type { Client } from "@/lib/definitions";

interface Notification {
    id: string;
    type: 'urgent' | 'warning' | 'info' | 'success';
    title: string;
    message: string;
    clientName?: string;
    daysUntilExpiry?: number;
    timestamp: Date;
}

function generateNotifications(clients: Client[]): Notification[] {
    const notifications: Notification[] = [];
    const today = new Date();

    clients?.forEach((client) => {
        if (!client.renewalDate) return;

        const renewalDate = parseISO(client.renewalDate);
        const daysUntilRenewal = differenceInDays(renewalDate, today);
        const isOverdue = isAfter(today, renewalDate);

        if (isOverdue) {
            // Cliente em atraso
            const daysOverdue = Math.abs(daysUntilRenewal);
            notifications.push({
                id: `overdue-${client.id}`,
                type: 'urgent',
                title: 'Cliente em Atraso',
                message: `${client.name} está ${daysOverdue} dia${daysOverdue > 1 ? 's' : ''} em atraso no pagamento`,
                clientName: client.name,
                daysUntilExpiry: daysUntilRenewal,
                timestamp: new Date()
            });
        } else if (daysUntilRenewal <= 3) {
            // Vence em até 3 dias - urgente
            notifications.push({
                id: `urgent-${client.id}`,
                type: 'urgent',
                title: 'Vencimento Urgente',
                message: `${client.name} vence ${daysUntilRenewal === 0 ? 'hoje' : `em ${daysUntilRenewal} dia${daysUntilRenewal > 1 ? 's' : ''}`}`,
                clientName: client.name,
                daysUntilExpiry: daysUntilRenewal,
                timestamp: new Date()
            });
        } else if (daysUntilRenewal <= 7) {
            // Vence em até 7 dias - aviso
            notifications.push({
                id: `warning-${client.id}`,
                type: 'warning',
                title: 'Vencimento Próximo',
                message: `${client.name} vence em ${daysUntilRenewal} dias (${format(renewalDate, 'dd/MM/yyyy')})`,
                clientName: client.name,
                daysUntilExpiry: daysUntilRenewal,
                timestamp: new Date()
            });
        }
    });

    // Ordenar por urgência e data
    return notifications.sort((a, b) => {
        const urgencyOrder = { urgent: 0, warning: 1, info: 2, success: 3 };
        if (urgencyOrder[a.type] !== urgencyOrder[b.type]) {
            return urgencyOrder[a.type] - urgencyOrder[b.type];
        }
        return (a.daysUntilExpiry || 0) - (b.daysUntilExpiry || 0);
    });
}

export function SmartNotifications() {
    const { firestore, user } = useFirebase();
    const resellerId = user?.uid;

    // Collections
    const clientsCollection = useMemoFirebase(() => {
        if (!resellerId) return null;
        return collection(firestore, 'resellers', resellerId, 'clients');
    }, [firestore, resellerId]);

    const { data: clients } = useCollection<Client>(clientsCollection);
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState<Notification[]>([]);

    useEffect(() => {
        if (clients !== undefined) {
            const newNotifications = generateNotifications(clients || []);
            setNotifications(newNotifications);
            setLoading(false);
        }
    }, [clients]);

    if (loading) {
        return (
            <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50">
                <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                            <Bell className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-headline font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
                                Notificações
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                                Verificando vencimentos...
                            </p>
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                        <div className="animate-spin">
                            <Clock className="h-5 w-5 text-blue-500" />
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            Analisando clientes e vencimentos...
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const urgentCount = notifications.filter(n => n.type === 'urgent').length;
    const warningCount = notifications.filter(n => n.type === 'warning').length;

    return (
        <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50 hover:shadow-2xl transition-all duration-300">
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                                <Bell className="h-5 w-5 text-white" />
                            </div>
                            {notifications.length > 0 && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-red-500 to-orange-500 rounded-full animate-pulse"></div>
                            )}
                        </div>
                        <div>
                            <h3 className="text-lg font-headline font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
                                Notificações
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                                Vencimentos e alertas
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {urgentCount > 0 && (
                            <Badge variant="destructive" className="bg-gradient-to-r from-red-500 to-orange-500 text-white border-0">
                                {urgentCount} urgente{urgentCount > 1 ? 's' : ''}
                            </Badge>
                        )}
                        {warningCount > 0 && (
                            <Badge variant="secondary" className="bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30 text-yellow-700 dark:text-yellow-300 border-0">
                                {warningCount} aviso{warningCount > 1 ? 's' : ''}
                            </Badge>
                        )}
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {notifications.length > 0 ? (
                    <div className="space-y-3">
                        {notifications.slice(0, 5).map((notification) => {
                            const getNotificationStyles = (type: string) => {
                                switch (type) {
                                    case 'urgent':
                                        return {
                                            container: 'bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 border border-red-200/50 dark:border-red-800/50',
                                            icon: 'bg-gradient-to-br from-red-500 to-orange-600',
                                            text: 'text-red-800 dark:text-red-200'
                                        };
                                    case 'warning':
                                        return {
                                            container: 'bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30 border border-yellow-200/50 dark:border-yellow-800/50',
                                            icon: 'bg-gradient-to-br from-yellow-500 to-amber-600',
                                            text: 'text-yellow-800 dark:text-yellow-200'
                                        };
                                    case 'success':
                                        return {
                                            container: 'bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border border-emerald-200/50 dark:border-emerald-800/50',
                                            icon: 'bg-gradient-to-br from-emerald-500 to-green-600',
                                            text: 'text-emerald-800 dark:text-emerald-200'
                                        };
                                    default:
                                        return {
                                            container: 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200/50 dark:border-blue-800/50',
                                            icon: 'bg-gradient-to-br from-blue-500 to-indigo-600',
                                            text: 'text-blue-800 dark:text-blue-200'
                                        };
                                }
                            };

                            const styles = getNotificationStyles(notification.type);
                            
                            return (
                                <div 
                                    key={notification.id} 
                                    className={`
                                        group flex items-start gap-4 p-4 rounded-xl transition-all duration-200 hover:scale-[1.02] cursor-pointer
                                        ${styles.container}
                                    `}
                                >
                                    <div className={`
                                        p-2 rounded-lg shadow-sm group-hover:scale-110 transition-transform duration-200
                                        ${styles.icon}
                                    `}>
                                        {notification.type === 'urgent' ? (
                                            <AlertTriangle className="h-4 w-4 text-white" />
                                        ) : notification.type === 'warning' ? (
                                            <Calendar className="h-4 w-4 text-white" />
                                        ) : notification.type === 'success' ? (
                                            <CheckCircle2 className="h-4 w-4 text-white" />
                                        ) : (
                                            <Info className="h-4 w-4 text-white" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <h4 className={`text-sm font-semibold ${styles.text}`}>
                                                {notification.title}
                                            </h4>
                                            {notification.daysUntilExpiry !== undefined && (
                                                <Badge 
                                                    variant="outline" 
                                                    className={`text-xs px-2 py-0.5 ${
                                                        notification.type === 'urgent' 
                                                            ? 'border-red-300 text-red-700 dark:border-red-700 dark:text-red-300' 
                                                            : 'border-yellow-300 text-yellow-700 dark:border-yellow-700 dark:text-yellow-300'
                                                    }`}
                                                >
                                                    {notification.daysUntilExpiry < 0 
                                                        ? `${Math.abs(notification.daysUntilExpiry)}d atraso` 
                                                        : notification.daysUntilExpiry === 0 
                                                        ? 'Hoje' 
                                                        : `${notification.daysUntilExpiry}d`
                                                    }
                                                </Badge>
                                            )}
                                        </div>
                                        <p className={`text-sm leading-relaxed ${styles.text} opacity-90`}>
                                            {notification.message}
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                            {format(notification.timestamp, 'HH:mm', { locale: ptBR })}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                        {notifications.length > 5 && (
                            <div className="text-center pt-2">
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    +{notifications.length - 5} notificações adicionais
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="p-4 bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30 rounded-2xl mb-4">
                            <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                            Tudo em ordem! 🎉
                        </h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Nenhum cliente próximo do vencimento
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                            Verificamos automaticamente vencimentos em 7 dias
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
