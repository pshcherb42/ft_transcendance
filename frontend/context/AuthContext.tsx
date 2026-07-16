'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { storeTokens, clearTokens, isLoggedIn, getAccessToken } from '@/app/lib/auth';
import { apiFetch, tryRefresh } from '@/app/lib/api';

interface User {
  id:         string;
  username:   string;
  email:      string;
  avatarPath: string | null;
  hasPassword: boolean;
}

interface AuthContextValue {
  user:    User | null;
  loading: boolean;
  login:   (access: string, refresh: string) => Promise<void>;
  logout:  () => void;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    setLoading(true);
    if (!isLoggedIn()) { setLoading(false); return; }
    try {
      const res = await apiFetch('/users/me');
      if (res.ok) setUser(await res.json());
      else        setUser(null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  // 🔄 🟢 NUEVO: Efecto para el refresco automático en segundo plano
  useEffect(() => {
    if (!user) return; // Solo ejecutamos si el usuario tiene sesión activa

    // Opción A: Intervalo fijo conservador (ej. cada 4 minutos si tu Access Token dura 5-10 minutos)
    const REFRESH_INTERVAL_MS = 12 * 60 * 1000; 

    const interval = setInterval(async () => {
      console.log('🔄 Verificando y refrescando sesión en segundo plano...');
      
      // Llamamos a tu función existente. Si falla, limpiará los tokens
      const success = await tryRefresh(); 
      
      if (!success) {
        setUser(null);
        window.location.href = '/login';
      }
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(interval); // Limpieza crucial al desmontar o desloguear
  }, [user]);

  const login = useCallback(async (access: string, refresh: string) => {
    storeTokens(access, refresh);
    await fetchUser();
  }, [fetchUser]);

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refetchUser: fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
