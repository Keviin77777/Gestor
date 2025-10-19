import { useState, useEffect } from 'react';

export interface AuthUser {
  reseller_id: string;
  email: string;
  display_name: string;
  is_admin: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const apiUrl = process.env.NEXT_PUBLIC_PHP_API_URL || 'http://localhost:8080';

  // Fallback temporário: se o usuário é admin-user-001, assume que é admin
  const isAdminFallback = user?.reseller_id === 'admin-user-001';

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // Verificar se há token no localStorage
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
        
        if (!token) {
          console.log('[useAuth] Sem token no localStorage');
          setLoading(false);
          return;
        }

        console.log('[useAuth] Token encontrado, buscando usuário de:', `/api/auth-user`);
        
        const response = await fetch(`/api/auth-user`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include',
        });

        console.log('[useAuth] Response status:', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('[useAuth] Dados recebidos:', data);
          setUser(data.user);
        } else {
          console.error('[useAuth] Erro na resposta:', response.status, response.statusText);
          // Se o token for inválido, limpar localStorage
          if (response.status === 401) {
            localStorage.removeItem('auth_token');
          }
        }
      } catch (error) {
        console.error('[useAuth] Erro ao buscar usuário:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [apiUrl]);

  // Força admin para email admin@admin.com (fallback adicional)
  const isAdminByEmail = user?.email === 'admin@admin.com';

  return {
    user,
    loading,
    isAdmin: isAdminByEmail || user?.is_admin || isAdminFallback,
  };
}
