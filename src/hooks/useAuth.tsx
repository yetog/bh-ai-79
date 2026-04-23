import React, { createContext, useContext, useState, useCallback } from 'react';

interface AuthContextValue {
  token: string | null;
  isAuthenticated: boolean;
  saveToken: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('BLACKHOLE_TOKEN')
  );

  const saveToken = useCallback((t: string) => {
    localStorage.setItem('BLACKHOLE_TOKEN', t);
    setToken(t);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('BLACKHOLE_TOKEN');
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, isAuthenticated: !!token, saveToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
