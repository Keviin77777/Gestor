import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { clients } from "@/lib/data";

export function RecentClients() {
  const recentClients = clients.slice(0, 5);

  return (
    <div className="space-y-8">
      {recentClients.map((client) => (
        <div key={client.id} className="flex items-center">
          <Avatar className="h-9 w-9">
            <AvatarImage src={`https://picsum.photos/seed/${client.id}/40/40`} data-ai-hint="person avatar" alt="Avatar" />
            <AvatarFallback>{client.name.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="ml-4 space-y-1">
            <p className="text-sm font-medium leading-none">{client.name}</p>
            <p className="text-sm text-muted-foreground">{client.plan}</p>
          </div>
          <div className="ml-auto font-medium">+R${client.value.toFixed(2)}</div>
        </div>
      ))}
    </div>
  );
}
