"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, Clock, AlertCircle, Phone, User } from "lucide-react";
import { differenceInDays, parseISO, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Client, Plan } from "@/lib/definitions";
import { useRouter } from "next/navigation";
import { useClients } from '@/hooks/use-clients';
import { usePlans } from '@/hooks/use-plans';

interface ExpiringClientsProps {
  clients?: Client[];
  plans?: Plan[];
}

export function ExpiringClients({ clients, plans }: ExpiringClientsProps) {
  const router = useRouter();

  const expiringClients = useMemo(() => {
    if (!clients) return [];

    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    return clients
      .filter(client => {
        if (client.status !== 'active') return false;
        const renewalDate = parseISO(client.renewal_date);
        return renewalDate >= today && renewalDate <= thirtyDaysFromNow;
      })
      .map(client => {
        const renewalDate = parseISO(client.renewal_date);
        const daysUntilExpiry = differenceInDays(renewalDate, today);
        const plan = plans?.find(p => p.id === client.plan_id);
        
        return {
          ...client,
          daysUntilExpiry,
          renewalDate,
          planName: plan?.name || 'Plano não encontrado',
        };
      })
      .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)
      .slice(0, 8); // Show top 8
  }, [clients, plans]);

  const getUrgencyColor = (days: number) => {
    if (days <= 3) return "bg-red-100 text-red-800 border-red-200";
    if (days <= 7) return "bg-orange-100 text-orange-800 border-orange-200";
    if (days <= 15) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-blue-100 text-blue-800 border-blue-200";
  };

  const getUrgencyIcon = (days: number) => {
    if (days <= 7) return <AlertCircle className="h-4 w-4" />;
    return <Clock className="h-4 w-4" />;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!clients || clients.length === 0) {
    return (
      <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-headline font-bold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Clientes perto de vencer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-slate-500">
            Nenhum cliente próximo do vencimento
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50 hover:shadow-2xl transition-all duration-300">
      <CardHeader className="pb-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl font-headline font-bold flex items-center gap-2 bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
              <Calendar className="h-5 w-5 text-blue-600" />
              Clientes perto de vencer
            </CardTitle>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Próximos 30 dias • {expiringClients.length} cliente{expiringClients.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => router.push('/dashboard/clients')}
            className="hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Ver todos
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {expiringClients.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-slate-600 dark:text-slate-400 font-medium">
              Tudo em dia! 🎉
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-500">
              Nenhum cliente vence nos próximos 30 dias
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {expiringClients.map((client) => (
              <div
                key={client.id}
                className="group relative p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-300 cursor-pointer"
                onClick={() => router.push('/dashboard/clients')}
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <Avatar className="h-12 w-12 border-2 border-slate-200 dark:border-slate-700 group-hover:border-blue-400 transition-colors">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold">
                      {getInitials(client.name)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Name and Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {client.name}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {client.planName}
                        </p>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`${getUrgencyColor(client.daysUntilExpiry)} flex items-center gap-1 shrink-0 font-semibold`}
                      >
                        {getUrgencyIcon(client.daysUntilExpiry)}
                        {client.daysUntilExpiry === 0 ? 'Hoje' : 
                         client.daysUntilExpiry === 1 ? 'Amanhã' : 
                         `${client.daysUntilExpiry} dias`}
                      </Badge>
                    </div>

                    {/* Details */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>
                          {format(client.renewalDate, "dd 'de' MMMM", { locale: ptBR })}
                        </span>
                      </div>
                      {client.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" />
                          <span>{client.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 font-semibold text-green-600 dark:text-green-400">
                        R$ {(client.value || 0).toFixed(2)}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="relative h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
                          client.daysUntilExpiry <= 3 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                          client.daysUntilExpiry <= 7 ? 'bg-gradient-to-r from-orange-500 to-orange-600' :
                          client.daysUntilExpiry <= 15 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                          'bg-gradient-to-r from-blue-500 to-blue-600'
                        }`}
                        style={{ 
                          width: `${Math.max(10, 100 - (client.daysUntilExpiry / 30 * 100))}%` 
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Hover Effect */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #475569;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }
      `}</style>
    </Card>
  );
}
