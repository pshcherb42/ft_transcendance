// hooks/useStats.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/app/lib/api';
import type { UserStats } from '@/types/stats';

export function useStats() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/users/me/stats');
      if (!res.ok) throw new Error('Failed to load stats');
      setStats(await res.json());
    } catch {
      setError('No se pudieron cargar las estadísticas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { stats, loading, error, refetch };
}
