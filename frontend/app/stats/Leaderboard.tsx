'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useLeaderboard } from '@/hooks/useLeaderboard';
import type { LeaderboardScope } from '@/types/leaderboard';
import UserAvatar from '@/components/UserAvatar';

export default function Leaderboard({
  currentUserId,
}: {
  currentUserId: string;
}) {
  const { t } = useTranslation();

  const [scope, setScope] =
    useState<LeaderboardScope>('friends');

  const {
    entries,
    loading,
    error,
  } = useLeaderboard(scope);

  return (
    <div className="overflow-hidden rounded-[10px] border border-[#D9D5D1] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 pt-6">
        <h2 className="font-display text-[24px] uppercase leading-none text-brand-red">
          {t('stats.leaderboard.title')}
        </h2>

        <div className="flex rounded-full border border-[#D9D5D1] p-1 text-xs font-medium">
          <button
            type="button"
            onClick={() =>
              setScope('friends')
            }
            className={
              scope === 'friends'
                ? 'rounded-full bg-brand-green px-4 py-2 text-white'
                : 'rounded-full px-4 py-2 text-[#615050] hover:bg-[#D9D9D9]/20'
            }
          >
            {t(
              'stats.leaderboard.friends',
            )}
          </button>

          <button
            type="button"
            onClick={() =>
              setScope('global')
            }
            className={
              scope === 'global'
                ? 'rounded-full bg-brand-green px-4 py-2 text-white'
                : 'rounded-full px-4 py-2 text-[#615050] hover:bg-[#D9D9D9]/20'
            }
          >
            {t(
              'stats.leaderboard.global',
            )}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="px-6 py-12 text-center text-sm text-zinc-400">
          {t(
            'stats.leaderboard.loading',
          )}
        </p>
      ) : error ? (
        <p className="px-6 py-12 text-center text-sm text-red-600">
          {error}
        </p>
      ) : entries.length === 0 ? (
        <p className="px-6 py-12 text-center text-sm text-zinc-400">
          {scope === 'friends'
            ? t(
                'stats.leaderboard.noFriendsMatches',
              )
            : t(
                'stats.leaderboard.noMatches',
              )}
        </p>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#EEE9E6] text-left text-xs text-zinc-400">
                <th className="px-6 py-3 font-medium">
                  {t(
                    'stats.leaderboard.rank',
                  )}
                </th>

                <th className="px-6 py-3 font-medium">
                  {t(
                    'stats.leaderboard.player',
                  )}
                </th>

                <th className="px-6 py-3 font-medium">
                  {t(
                    'stats.leaderboard.wl',
                  )}
                </th>

                <th className="px-6 py-3 font-medium">
                  {t(
                    'stats.leaderboard.winRate',
                  )}
                </th>
              </tr>
            </thead>

            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.userId}
                  className={
                    entry.userId ===
                    currentUserId
                      ? 'border-b border-[#EEE9E6] bg-background last:border-0'
                      : 'border-b border-[#EEE9E6] last:border-0'
                  }
                >
                  <td className="px-6 py-4 tabular-nums text-zinc-400">
                    {entry.rank}
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                    <UserAvatar
                      username={entry.username}
                      avatarPath={entry.avatarPath}
                      size="sm"
                    />

                      <span className="font-medium text-[#615050]">
                        {entry.username}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-4 tabular-nums text-[#615050]">
                    {entry.wins}-
                    {entry.losses}
                  </td>

                  <td className="px-6 py-4 tabular-nums font-medium text-[#615050]">
                    {Math.round(
                      entry.winRate * 100,
                    )}
                    %
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