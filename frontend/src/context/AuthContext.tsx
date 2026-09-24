import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User } from '../types';
import { getMe } from '../api/auth';
import { getToken, setToken, clearToken } from '../api/client';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(getToken());
  const [isLoading, setIsLoading] = useState(true);

  const login = useCallback((newToken: string, newUser: User) => {
    setToken(newToken);
    setTokenState(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setTokenState(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const me = await getMe();
      setUser(me);
    } catch {
      logout();
    }
  }, [logout]);

  useEffect(() => {
    const storedToken = getToken();
    if (storedToken) {
      setTokenState(storedToken);
      getMe()
        .then((me) => setUser(me))
        .catch(() => {
          clearToken();
          setTokenState(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
