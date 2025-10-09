"use client";

import { ClientTable } from "@/components/clients/client-table";

export default function ClientsPage() {
    return (
        <div className="space-y-8 animate-fade-in">
            <ClientTable />
        </div>
    );
}
