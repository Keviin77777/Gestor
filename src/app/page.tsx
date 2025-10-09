'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMySQL } from '@/lib/mysql-provider';

export default function Home() {
  const { user, isLoading } = useMySQL();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [user, isLoading, router]);

  // Show loading while checking authentication
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-slate-600 dark:text-slate-400">Carregando...</p>
      </div>
    </div>
  );
}
