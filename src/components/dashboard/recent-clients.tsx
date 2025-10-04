"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFirebase, useMemoFirebase } from "@/firebase";
import { useCollection } from "@/firebase/firestore/use-collection";
import { Client, Plan } from "@/lib/definitions";
import { collection, limit, orderBy, query } from "firebase/firestore";

export function RecentClients() {
  const { firestore, user } = useFirebase();
  const resellerId = user?.uid;

  const recentClientsQuery = useMemoFirebase(() => {
    if (!resellerId) return null;
    const clientsRef = collection(firestore, 'resellers', resellerId, 'clients');
    return query(clientsRef, orderBy('startDate', 'desc'), limit(5));
  }, [firestore, resellerId]);

  const plansCollection = useMemoFirebase(() => {
    if (!resellerId) return null;
    return collection(firestore, 'resellers', resellerId, 'plans');
  }, [firestore, resellerId]);

  const { data: recentClients, isLoading } = useCollection<Client>(recentClientsQuery);
  const { data: plans } = useCollection<Plan>(plansCollection);

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
              {plans?.find(p => p.id === client.planId)?.name || client.planId}
            </p>
          </div>
          <div className="ml-auto font-medium">+R${client.paymentValue.toFixed(2)}</div>
        </div>
      ))}
       {!recentClients?.length && <p className="text-sm text-muted-foreground">Nenhum cliente recente.</p>}
    </div>
  );
}
