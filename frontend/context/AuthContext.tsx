'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { storeTokens, clearTokens, isLoggedIn } from '@/app/lib/auth';
import { apiFetch } from '@/app/lib/api';

interface User {
  id:         number;
  username:   string;
  email:      string;
  avatarPath: string | null;
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
