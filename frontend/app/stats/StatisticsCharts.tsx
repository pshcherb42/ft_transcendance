'use client';

import { useTranslation } from 'react-i18next';
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

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
);

type Match = {
  id: string;
  opponent: string;
  myScore: number;
  opponentScore: number;
  won: boolean;
  createdAt: string;
};

type Stats = {
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number;
  matches: Match[];
};

const COLORS = {
  surface: '#FFFFFF',
  textPrimary: '#615050',
  textSecondary: '#615050',
  muted: '#A3A3A3',
  grid: '#EEE9E6',
  good: '#9DA995',
  critical: '#EE4424',
  seriesYou: '#9DA995',
  seriesOpponent: '#EE4424',
};

function centerTextPlugin(
  label: string,
  color: string,
  winsLabel: string,
): Plugin<'doughnut'> {
  return {
    id: 'centerText',

    afterDraw(chart) {
      const { ctx, chartArea } = chart;

      if (!chartArea) {
        return;
      }

      const x =
        (chartArea.left + chartArea.right) / 2;

      const y =
        (chartArea.top + chartArea.bottom) / 2;

      ctx.save();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.font =
        '600 22px system-ui, -apple-system, "Segoe UI", sans-serif';

      ctx.fillStyle = color;
      ctx.fillText(label, x, y - 8);

      ctx.font =
        '12px system-ui, -apple-system, "Segoe UI", sans-serif';

      ctx.fillText(winsLabel, x, y + 14);

      ctx.restore();
    },
  };
}

export default function StatisticsCharts({
  stats,
}: {
  stats: Stats;
}) {
  const { t } = useTranslation();

  const winRatePct = Math.round(
    stats.winRate * 100,
  );

  const recentMatches = [
    ...stats.matches,
  ]
    .slice(0, 10)
    .reverse();

  const doughnutData = {
    labels: [
      t('stats.result.win'),
      t('stats.result.loss'),
    ],

    datasets: [
      {
        data: [
          stats.wins,
          stats.losses,
        ],

        backgroundColor: [
          COLORS.good,
          COLORS.critical,
        ],

        borderColor: COLORS.surface,
        borderWidth: 2,
        hoverOffset: 4,
      },
    ],
  };

  const barData = {
    labels: recentMatches.map(
      (_, index) => `#${index + 1}`,
    ),

    datasets: [
      {
        label: t('stats.you'),

        data: recentMatches.map(
          (match) => match.myScore,
        ),

        backgroundColor:
          COLORS.seriesYou,

        borderRadius: 4,
      },

      {
        label: t('stats.opponent'),

        data: recentMatches.map(
          (match) =>
            match.opponentScore,
        ),

        backgroundColor:
          COLORS.seriesOpponent,

        borderRadius: 4,
      },
    ],
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-[10px] border border-[#D9D5D1] bg-white p-6">
        <h2 className="mb-4 font-display text-[24px] uppercase leading-none text-brand-red">
          {t('stats.winLossChart')}
        </h2>

        <div className="h-[280px]">
          <Doughnut
            data={doughnutData}
            options={{
              maintainAspectRatio: false,

              cutout: '68%',

              plugins: {
                legend: {
                  position: 'bottom',

                  labels: {
                    color:
                      COLORS.textSecondary,

                    boxWidth: 12,
                    padding: 16,
                  },
                },

                tooltip: {
                  backgroundColor:
                    COLORS.surface,

                  titleColor:
                    COLORS.textPrimary,

                  bodyColor:
                    COLORS.textSecondary,

                  borderColor: COLORS.grid,
                  borderWidth: 1,
                },
              },
            }}
            plugins={[
              centerTextPlugin(
                `${winRatePct}%`,
                COLORS.textPrimary,
                t('stats.chartWinsLabel'),
              ),
            ]}
          />
        </div>
      </div>

      <div className="rounded-[10px] border border-[#D9D5D1] bg-white p-6">
        <h2 className="mb-4 font-display text-[24px] uppercase leading-none text-brand-red">
          {t('stats.scoreChart', {
            count: recentMatches.length,
          })}
        </h2>

        <div className="h-[280px]">
          <Bar
            data={barData}
            options={{
              maintainAspectRatio: false,

              scales: {
                x: {
                  grid: {
                    display: false,
                  },

                  ticks: {
                    color: COLORS.muted,
                  },
                },

                y: {
                  beginAtZero: true,

                  grid: {
                    color: COLORS.grid,
                  },

                  ticks: {
                    color: COLORS.muted,
                    precision: 0,
                  },
                },
              },

              plugins: {
                legend: {
                  position: 'bottom',

                  labels: {
                    color:
                      COLORS.textSecondary,

                    boxWidth: 12,
                    padding: 16,
                  },
                },

                tooltip: {
                  backgroundColor:
                    COLORS.surface,

                  titleColor:
                    COLORS.textPrimary,

                  bodyColor:
                    COLORS.textSecondary,

                  borderColor: COLORS.grid,
                  borderWidth: 1,
                },
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}