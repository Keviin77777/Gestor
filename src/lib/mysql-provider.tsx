'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { mysqlApi, User } from './mysql-api-client';

interface MySQLContextState {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const MySQLContext = createContext<MySQLContextState | undefined>(undefined);

export function MySQLProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const token = mysqlApi.getToken();
      
      if (token) {
        try {
          const currentUser = await mysqlApi.getCurrentUser();
          setUser(currentUser);
        } catch (err) {
          console.error('MySQLProvider: Session check failed:', err);
          mysqlApi.clearToken();
        }
      }
      setIsLoading(false);
    };

    checkSession();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const { user: loggedInUser } = await mysqlApi.login(email, password);
      setUser(loggedInUser);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Login failed');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await mysqlApi.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      mysqlApi.clearToken();
    }
  };

  const refreshUser = async () => {
    try {
      const currentUser = await mysqlApi.getCurrentUser();
      setUser(currentUser);
    } catch (err) {
      console.error('Refresh user failed:', err);
      setUser(null);
      mysqlApi.clearToken();
    }
  };

  return (
    <MySQLContext.Provider
      value={{
        user,
        isLoading,
        error,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </MySQLContext.Provider>
  );
}

export function useMySQL() {
  const context = useContext(MySQLContext);
  if (context === undefined) {
    throw new Error('useMySQL must be used within a MySQLProvider');
  }
  return context;
}

// Alias for compatibility
export const useAuth = useMySQL;
export const useUser = () => {
  const { user, isLoading, error } = useMySQL();
  return { user, isUserLoading: isLoading, userError: error };
};
