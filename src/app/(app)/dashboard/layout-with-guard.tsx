'use client';

import { SubscriptionGuard } from '@/components/subscription/subscription-guard';

export function DashboardLayoutWithGuard({ children }: { children: React.ReactNode }) {
  return (
    <SubscriptionGuard>
      {children}
    </SubscriptionGuard>
  );
}
