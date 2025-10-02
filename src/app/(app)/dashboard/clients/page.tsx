import { ClientTable } from "@/components/clients/client-table";
import { clients } from "@/lib/data";

export default function ClientsPage() {
    return (
        <div>
            <ClientTable data={clients} />
        </div>
    );
}
