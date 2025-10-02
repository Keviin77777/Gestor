"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth, useFirebase, useMemoFirebase } from "@/firebase";
import { useCollection } from "@/firebase/firestore/use-collection";
import { Client } from "@/lib/definitions";
import { collection, limit, orderBy, query } from "firebase/firestore";

export function RecentClients() {
  const { firestore } = useFirebase();
  const { user } = useAuth();
  const resellerId = user?.uid;

  const recentClientsQuery = useMemoFirebase(() => {
    if (!resellerId) return null;
    const clientsRef = collection(firestore, 'resellers', resellerId, 'clients');
    return query(clientsRef, orderBy('startDate', 'desc'), limit(5));
  }, [firestore, resellerId]);

  const { data: recentClients, isLoading } = useCollection<Client>(recentClientsQuery);

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-8">
      {recentClients?.map((client) => (
        <div key={client.id} className="flex items-center">
          <Avatar className="h-9 w-9">
            <AvatarImage src={`https://picsum.photos/seed/${client.id}/40/40`} data-ai-hint="person avatar" alt="Avatar" />
            <AvatarFallback>{client.name.substring(0, 2).toUpperCase()}}</AvatarFallback>
          </Avatar>
          <div className="ml-4 space-y-1">
            <p className="text-sm font-medium leading-none">{client.name}</p>
            <p className="text-sm text-muted-foreground">{client.planId}</p>
          </div>
          <div className="ml-auto font-medium">+R${client.paymentValue.toFixed(2)}</div>
        </div>
      ))}
       {!recentClients?.length && <p className="text-sm text-muted-foreground">Nenhum cliente recente.</p>}
    </div>
  );
}
