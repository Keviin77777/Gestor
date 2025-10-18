'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useResellerSubscription } from '@/hooks/use-reseller-subscription';
import { Loader2 } from 'lucide-react';

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data, loading } = useResellerSubscription();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (loading) return;

    if (!data) {
      setChecking(false);
      return;
    }

    const { subscription } = data;

    // Admin sempre tem acesso
    if (subscription.is_admin) {
      setChecking(false);
      return;
    }

    // Permitir acesso à página de renovação sempre
    if (pathname === '/dashboard/subscription') {
      setChecking(false);
      return;
    }

    // Verificar se expirou
    if (subscription.subscription_health === 'expired') {
      console.log('🚫 Assinatura expirada, redirecionando para renovação...');
      router.push('/dashboard/subscription');
      return;
    }

    // Verificar se não tem assinatura
    if (!subscription.subscription_expiry_date) {
      console.log('🚫 Sem assinatura, redirecionando para renovação...');
      router.push('/dashboard/subscription');
      return;
    }

    // Tudo OK
    setChecking(false);
  }, [data, loading, router, pathname]);

  if (loading || checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
