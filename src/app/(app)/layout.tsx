import type { ReactNode } from 'react';
import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { AuthGuard } from '@/components/auth/auth-guard';
import { SubscriptionGuard } from '@/components/subscription/subscription-guard';
import { AutoReminderProcessor } from '@/components/whatsapp/auto-reminder-processor';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <SubscriptionGuard>
        <AutoReminderProcessor />
        <SidebarLayout>{children}</SidebarLayout>
      </SubscriptionGuard>
    </AuthGuard>
  );
}
