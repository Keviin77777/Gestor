"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMySQL } from '@/lib/mysql-provider';
// Removed useCollection - using direct API calls;
import { Client, Plan } from "@/lib/definitions";
import { useClients } from '@/hooks/use-clients';
import { usePlans } from '@/hooks/use-plans';
// Removed Firebase Firestore imports;

export function RecentClients() {
  const { data: clients, isLoading } = useClients();
  const { data: plans } = usePlans();

  // Get 5 most recent clients
  const recentClients = clients
    ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5) || [];

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-8">
      {recentClients?.map((client) => (
        <div key={client.id} className="flex items-center">
          <Avatar className="h-9 w-9">
            <AvatarFallback>{client.name.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="ml-4 space-y-1">
            <p className="text-sm font-medium leading-none">{client.name}</p>
            <p className="text-sm text-muted-foreground">
              {plans?.find(p => p.id === client.plan_id)?.name || client.plan_id}
            </p>
          </div>
          <div className="ml-auto font-medium">+R${(client.value || 0).toFixed(2)}</div>
        </div>
      ))}
      {!recentClients?.length && <p className="text-sm text-muted-foreground">Nenhum cliente recente.</p>}
    </div>
  );
}
