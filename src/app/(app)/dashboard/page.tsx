'use client';

import { useAuth } from '@/hooks/use-auth';
import AdminDashboard from '@/components/dashboard/admin-dashboard';
import ResellerDashboard from '@/components/dashboard/reseller-dashboard';
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Admin vê dashboard de revendas + clientes
  // Revenda vê apenas dashboard de clientes
  return isAdmin ? <AdminDashboard /> : <ResellerDashboard />;
}
