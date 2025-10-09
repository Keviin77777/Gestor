'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMySQL } from '@/lib/mysql-provider';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { user, isLoading } = useMySQL();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Show fallback or nothing if not authenticated
  if (!user) {
    return fallback || null;
  }

  // User is authenticated, show children
  return <>{children}</>;
}
