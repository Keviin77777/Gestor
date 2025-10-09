import type { ReactNode } from 'react';
import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { AuthGuard } from '@/components/auth/auth-guard';
import { AutoReminderProcessor } from '@/components/whatsapp/auto-reminder-processor';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <AutoReminderProcessor />
      <SidebarLayout>{children}</SidebarLayout>
    </AuthGuard>
  );
}
