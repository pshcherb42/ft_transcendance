'use client';

import { useTranslation } from 'react-i18next';

type Match = {
  id: string;
  opponent: string;
  myScore: number;
  opponentScore: number;
  won: boolean;
  createdAt: string;
};

export default function MatchHistory({
  matches,
}: {
  matches: Match[];
}) {
  const { t } = useTranslation();

  return (
    <div className="overflow-hidden rounded-[10px] border border-[#D9D5D1] bg-white">
      <h2 className="px-6 pt-6 font-display text-[20px] uppercase leading-none text-brand-red sm:text-[22px] md:text-[24px]">
        {t('stats.matchHistory')}
      </h2>

      {matches.length === 0 ? (
        <div className="flex min-h-[220px] items-center justify-center px-6">
          <p className="text-center text-sm text-zinc-400">
            {t('stats.noMatches')}
          </p>
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#EEE9E6] text-left text-xs text-zinc-400">
                <th className="px-6 py-3 font-medium">
                  {t('stats.table.opponent')}
                </th>

                <th className="px-6 py-3 font-medium">
                  {t('stats.table.score')}
                </th>

                <th className="px-6 py-3 font-medium">
                  {t('stats.table.result')}
                </th>

                <th className="px-6 py-3 font-medium">
                  {t('stats.table.date')}
                </th>
              </tr>
            </thead>

            <tbody>
              {matches.map((match) => (
                <tr
                  key={match.id}
                  className="border-b border-[#EEE9E6] last:border-0"
                >
                  <td className="px-6 py-4 text-[#615050]">
                    {match.opponent}
                  </td>

                  <td className="px-6 py-4 tabular-nums text-[#615050]">
                    {match.myScore} –{' '}
                    {match.opponentScore}
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={
                        match.won
                          ? 'font-medium text-brand-green'
                          : 'font-medium text-brand-red'
                      }
                    >
                      {match.won
                        ? t('stats.result.win')
                        : t('stats.result.loss')}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-zinc-400">
                    {new Date(
                      match.createdAt,
                    ).toLocaleDateString()}
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