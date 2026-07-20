'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  type Plugin,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { useAuth } from '@/context/AuthContext';
import { useStats } from '@/hooks/useStats';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { usePrefersDark } from '@/hooks/usePrefersDark';
import type { LeaderboardScope } from '@/types/leaderboard';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

// Reference palette — see dataviz skill. Status pair for the win/loss state,
// two categorical slots (blue / orange) for the score comparison.
const PALETTE = {
  light: {
    surface: '#fcfcfb',
    textPrimary: '#0b0b0b',
    textSecondary: '#52514e',
    muted: '#898781',
    grid: '#e1e0d9',
    good: '#0ca30c',
    critical: '#d03b3b',
    seriesYou: '#2a78d6',
    seriesOpponent: '#eb6834',
  },
  dark: {
    surface: '#1a1a19',
    textPrimary: '#ffffff',
    textSecondary: '#c3c2b7',
    muted: '#898781',
    grid: '#2c2c2a',
    good: '#0ca30c',
    critical: '#e66767',
    seriesYou: '#3987e5',
    seriesOpponent: '#d95926',
  },
};

// Draws the win-rate percentage in the center of the doughnut as a direct label.
function centerTextPlugin(label: string, color: string): Plugin<'doughnut'> {
  return {
    id: 'centerText',
    afterDraw(chart) {
      const { ctx, chartArea } = chart;
      if (!chartArea) return;
      const x = (chartArea.left + chartArea.right) / 2;
      const y = (chartArea.top + chartArea.bottom) / 2;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '600 22px system-ui, -apple-system, "Segoe UI", sans-serif';
      ctx.fillStyle = color;
      ctx.fillText(label, x, y - 8);
      ctx.font = '12px system-ui, -apple-system, "Segoe UI", sans-serif';
      ctx.fillStyle = color;
      ctx.fillText('victorias', x, y + 14);
      ctx.restore();
    },
  };
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-5 shadow-sm">
      <span className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 tabular-nums">{value}</span>
      <span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
    </div>
  );
}

function Leaderboard({ currentUserId }: { currentUserId: string }) {
  const [scope, setScope] = useState<LeaderboardScope>('friends');
  const { entries, loading, error } = useLeaderboard(scope);

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-5">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Leaderboard</h2>
        <div className="flex rounded-full border border-zinc-200 dark:border-zinc-700 p-0.5 text-xs font-medium">
          <button
            type="button"
            onClick={() => setScope('friends')}
            className={
              scope === 'friends'
                ? 'rounded-full bg-zinc-900 dark:bg-zinc-50 px-3 py-1 text-white dark:text-black'
                : 'rounded-full px-3 py-1 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50'
            }
          >
            Amigos
          </button>
          <button
            type="button"
            onClick={() => setScope('global')}
            className={
              scope === 'global'
                ? 'rounded-full bg-zinc-900 dark:bg-zinc-50 px-3 py-1 text-white dark:text-black'
                : 'rounded-full px-3 py-1 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50'
            }
          >
            General
          </button>
        </div>
      </div>

      {loading ? (
        <p className="px-5 py-8 text-center text-sm text-zinc-400">Cargando…</p>
      ) : error ? (
        <p className="px-5 py-8 text-center text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : entries.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          {scope === 'friends'
            ? 'Todavía nadie de tu lista de amigos jugó una partida.'
            : 'Todavía no hay partidas registradas.'}
        </p>
      ) : (
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-left text-xs text-zinc-500 dark:text-zinc-400">
                <th className="px-5 py-2 font-medium">#</th>
                <th className="px-5 py-2 font-medium">Jugador</th>
                <th className="px-5 py-2 font-medium">W-L</th>
                <th className="px-5 py-2 font-medium">% Victorias</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr
                  key={e.userId}
                  className={
                    e.userId === currentUserId
                      ? 'bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-100 dark:border-zinc-900 last:border-0'
                      : 'border-b border-zinc-100 dark:border-zinc-900 last:border-0'
                  }
                >
                  <td className="px-5 py-2 tabular-nums text-zinc-500 dark:text-zinc-400">{e.rank}</td>
                  <td className="px-5 py-2">
                    <div className="flex items-center gap-2">
                      <img src={e.avatarPath} alt="" className="h-6 w-6 rounded-full object-cover" />
                      <span className="text-zinc-900 dark:text-zinc-50">{e.username}</span>
                    </div>
                  </td>
                  <td className="px-5 py-2 tabular-nums text-zinc-700 dark:text-zinc-300">
                    {e.wins}-{e.losses}
                  </td>
                  <td className="px-5 py-2 tabular-nums font-medium text-zinc-900 dark:text-zinc-50">
                    {Math.round(e.winRate * 100)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function StatsPage() {
  const { user, loading: authLoading } = useAuth();
  const { stats, loading: statsLoading, error } = useStats();
  const router = useRouter();
  const prefersDark = usePrefersDark();
  const colors = prefersDark ? PALETTE.dark : PALETTE.light;

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  if (authLoading || !user || statsLoading) {
    return (
      <main className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
        <p className="text-zinc-400">Loading…</p>
      </main>
    );
  }

  if (error || !stats) {
    return (
      <main className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
        <p className="text-sm text-red-600 dark:text-red-400">{error ?? 'No se pudieron cargar las estadísticas'}</p>
      </main>
    );
  }

  const winRatePct = Math.round(stats.winRate * 100);
  const hasMatches = stats.totalMatches > 0;
  const recentMatches = [...stats.matches].slice(0, 10).reverse();

  const doughnutData = {
    labels: ['Victorias', 'Derrotas'],
    datasets: [
      {
        data: [stats.wins, stats.losses],
        backgroundColor: [colors.good, colors.critical],
        borderColor: colors.surface,
        borderWidth: 2,
        hoverOffset: 4,
      },
    ],
  };

  const barData = {
    labels: recentMatches.map((_, i) => `#${i + 1}`),
    datasets: [
      {
        label: 'Tú',
        data: recentMatches.map((m) => m.myScore),
        backgroundColor: colors.seriesYou,
        borderRadius: 4,
      },
      {
        label: 'Rival',
        data: recentMatches.map((m) => m.opponentScore),
        backgroundColor: colors.seriesOpponent,
        borderRadius: 4,
      },
    ],
  };

  return (
    <main className="flex flex-1 flex-col items-center bg-zinc-50 dark:bg-black px-4 py-10 gap-8">
      <div className="w-full max-w-3xl space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Estadísticas</h1>
          <Link
            href="/"
            className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors"
          >
            ← Volver
          </Link>
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile label="Partidas" value={stats.totalMatches} />
          <StatTile label="Victorias" value={stats.wins} />
          <StatTile label="Derrotas" value={stats.losses} />
          <StatTile label="% Victorias" value={`${winRatePct}%`} />
        </div>

        {!hasMatches ? (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-10 text-center">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Todavía no has jugado ninguna partida. ¡Juega tu primer Pong para ver tus estadísticas aquí!
            </p>
            <Link
              href="/game"
              className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-zinc-900 dark:bg-zinc-50 px-6 text-sm font-medium text-white dark:text-black hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors"
            >
              Jugar ahora
            </Link>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Win / loss ratio */}
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
                <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">Victorias vs derrotas</h2>
                <div className="h-56">
                  <Doughnut
                    data={doughnutData}
                    options={{
                      maintainAspectRatio: false,
                      cutout: '68%',
                      plugins: {
                        legend: {
                          position: 'bottom',
                          labels: { color: colors.textSecondary, boxWidth: 12, padding: 16 },
                        },
                        tooltip: {
                          backgroundColor: colors.surface,
                          titleColor: colors.textPrimary,
                          bodyColor: colors.textSecondary,
                          borderColor: colors.grid,
                          borderWidth: 1,
                        },
                      },
                    }}
                    plugins={[centerTextPlugin(`${winRatePct}%`, colors.textPrimary)]}
                  />
                </div>
              </div>

              {/* Score comparison, last matches */}
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
                <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                  Puntuación — últimas {recentMatches.length} partidas
                </h2>
                <div className="h-56">
                  <Bar
                    data={barData}
                    options={{
                      maintainAspectRatio: false,
                      scales: {
                        x: {
                          grid: { display: false },
                          ticks: { color: colors.muted },
                        },
                        y: {
                          beginAtZero: true,
                          grid: { color: colors.grid },
                          ticks: { color: colors.muted, precision: 0 },
                        },
                      },
                      plugins: {
                        legend: {
                          position: 'bottom',
                          labels: { color: colors.textSecondary, boxWidth: 12, padding: 16 },
                        },
                        tooltip: {
                          backgroundColor: colors.surface,
                          titleColor: colors.textPrimary,
                          bodyColor: colors.textSecondary,
                          borderColor: colors.grid,
                          borderWidth: 1,
                        },
                      },
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Table view — accessible alternative to the charts above */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
              <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 px-5 pt-5">Historial de partidas</h2>
              <div className="overflow-x-auto mt-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 text-left text-xs text-zinc-500 dark:text-zinc-400">
                      <th className="px-5 py-2 font-medium">Rival</th>
                      <th className="px-5 py-2 font-medium">Marcador</th>
                      <th className="px-5 py-2 font-medium">Resultado</th>
                      <th className="px-5 py-2 font-medium">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.matches.map((m) => (
                      <tr key={m.id} className="border-b border-zinc-100 dark:border-zinc-900 last:border-0">
                        <td className="px-5 py-2 text-zinc-900 dark:text-zinc-50">{m.opponent}</td>
                        <td className="px-5 py-2 tabular-nums text-zinc-700 dark:text-zinc-300">
                          {m.myScore} – {m.opponentScore}
                        </td>
                        <td className="px-5 py-2">
                          <span
                            className={
                              m.won
                                ? 'text-green-700 dark:text-green-400 font-medium'
                                : 'text-red-700 dark:text-red-400 font-medium'
                            }
                          >
                            {m.won ? 'Victoria' : 'Derrota'}
                          </span>
                        </td>
                        <td className="px-5 py-2 text-zinc-500 dark:text-zinc-400">
                          {new Date(m.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        <Leaderboard currentUserId={user.id} />
      </div>
    </main>
  );
}
