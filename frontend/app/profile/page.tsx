'use client';

import {
  useEffect,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import FriendsPanel from '@/app/friends/FriendsPanel';
import StatisticsCharts from '@/app/stats/StatisticsCharts';
import MatchHistory from '@/app/stats/MatchHistory';
import Leaderboard from '@/app/stats/Leaderboard';

import { useAuth } from '@/context/AuthContext';
import { useStats } from '@/hooks/useStats';

import ProfileHeader from './ProfileHeader';
import ProfileTabs from './ProfileTabs';
import EditProfileModal from './EditProfileModal';

import type { ProfileTab } from './types';

export default function ProfilePage() {
  const { t } = useTranslation();

  const {
    user,
    loading,
  } = useAuth();

  const {
    stats,
    loading: statsLoading,
    error: statsError,
  } = useStats();

  const router = useRouter();

  const [activeTab, setActiveTab] =
    useState<ProfileTab>('friends');

  const [editModalOpen, setEditModalOpen] =
    useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-zinc-400">
          {t('profile.loading')}
        </p>
      </main>
    );
  }

  const games =
    stats?.totalMatches ?? 0;

  const wins =
    stats?.wins ?? 0;

  const losses =
    stats?.losses ?? 0;

  const winPercentage = Math.round(
    (stats?.winRate ?? 0) * 100,
  );

  return (
    <div className="relative flex min-h-[calc(100dvh-48px)] flex-col overflow-hidden bg-background">
      <main className="relative z-10 flex flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-4 px-8 pt-8 md:px-16">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="
              h-[46px]
              min-w-[190px]
              rounded-full
              border
              border-[#D9D5D1]
              px-8
              text-[14px]
              font-medium
              uppercase
              text-[#615050]
              transition-colors
              hover:bg-[#D9D9D9]/20
            "
          >
            {t('game.button.backToMenu')}
          </button>

          <div className="ml-auto flex flex-wrap gap-4">
            <button
              type="button"
              onClick={() =>
                router.push('/chat')
              }
              className="
                h-[46px]
                min-w-[190px]
                rounded-full
                bg-brand-red
                px-8
                text-[14px]
                font-medium
                uppercase
                text-white
                transition-colors
                hover:bg-[#D9361F]
              "
            >
              {t('game.button.chat')}
            </button>

            <button
              type="button"
              onClick={() =>
                setEditModalOpen(true)
              }
              className="
                h-[46px]
                min-w-[190px]
                rounded-full
                bg-brand-green
                px-8
                text-[14px]
                font-medium
                uppercase
                text-white
                transition-colors
                hover:bg-[#808979]
              "
            >
              {t('game.button.editProfile')}
            </button>
          </div>
        </header>

        <section className="mx-auto flex w-full flex-1 flex-col px-8 pb-12 pt-10 md:px-16">
          <ProfileHeader
            username={user.username}
            email={user.email}
            avatarPath={
              user.avatarPath ?? null
            }
            games={games}
            wins={wins}
            losses={losses}
            winPercentage={
              winPercentage
            }
          />

          <ProfileTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          <div
            className="
              mt-6
              min-h-[420px]
              w-full
              rounded-[10px]
              bg-white
              px-8
              py-10
              shadow-[-8px_8px_32px_0_rgba(193,168,163,0.25)]
              md:px-12
            "
          >
            {activeTab === 'friends' && (
              <FriendsPanel />
            )}

            {activeTab ===
              'statistics' && (
              <>
                {statsLoading ? (
                  <LoadingState
                    text={t(
                      'stats.loading',
                    )}
                  />
                ) : statsError ||
                  !stats ? (
                  <ErrorState
                    text={
                      statsError
                        ? t(statsError)
                        : t(
                            'stats.loadError',
                          )
                    }
                  />
                ) : (
                  <div className="flex flex-col gap-8">
                    <StatisticsCharts
                      stats={stats}
                    />

                    <MatchHistory
                      matches={
                        stats.matches
                      }
                    />
                  </div>
                )}
              </>
            )}

            {activeTab ===
              'leaderboard' && (
              <Leaderboard
                currentUserId={user.id}
              />
            )}
          </div>
        </section>
      </main>

      <EditProfileModal
        open={editModalOpen}
        onClose={() =>
          setEditModalOpen(false)
        }
      />
    </div>
  );
}

function LoadingState({
  text,
}: {
  text: string;
}) {
  return (
    <div className="flex min-h-[320px] items-center justify-center">
      <p className="text-sm text-zinc-400">
        {text}
      </p>
    </div>
  );
}

function ErrorState({
  text,
}: {
  text: string;
}) {
  return (
    <div className="flex min-h-[320px] items-center justify-center">
      <p className="text-sm text-red-600">
        {text}
      </p>
    </div>
  );
}