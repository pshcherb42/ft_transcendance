// hooks/useLeaderboard.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/app/lib/api';
import type { LeaderboardEntry, LeaderboardScope } from '@/types/leaderboard';

export function useLeaderboard(scope: LeaderboardScope) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/users/leaderboard?scope=${scope}`);
      if (!res.ok) throw new Error('Failed to load leaderboard');
      setEntries(await res.json());
    } catch {
      setError('No se pudo cargar el leaderboard');
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => { refetch(); }, [refetch]);

  return { entries, loading, error, refetch };
}
