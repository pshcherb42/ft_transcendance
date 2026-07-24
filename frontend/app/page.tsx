
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import BouncingBall from '@/components/bouncingBall';
import { useTranslation } from 'react-i18next';

type Difficulty = 'easy' | 'medium' | 'hard';
type MapId = 'classic' | 'obstacles';

export default function HomePage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();

  const difficulties: {
    value: Difficulty;
    label: string;
  }[] = [
    { value: 'easy', label: t('game.difficulty.easy') },
    { value: 'medium', label: t('game.difficulty.medium') },
    { value: 'hard', label: t('game.difficulty.hard') },
  ];

  const [difficulty, setDifficulty] =
    useState<Difficulty>('easy');

  const [mapId, setMapId] =
    useState<MapId>('classic');
  
  const [powerups, setPowerups] =
    useState(false);

  const [logoutLoading, setLogoutLoading] =
    useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  async function handleLogout() {
    setLogoutLoading(true);

    try {
      await logout();
      router.replace('/login');
    } finally {
      setLogoutLoading(false);
    }
  }

  function startGame(
    mode: 'online' | 'local' | 'ai' | 'tournament',
  ) {
    const params = new URLSearchParams();
  
    params.set('mode', mode);
    params.set('map', mapId);
    params.set('powerups', String(powerups));
  
    if (mode === 'ai') {
      params.set('difficulty', difficulty);
    }
  
    router.push(`/game?${params.toString()}`);
  }

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-zinc-400">
          {t('game.loading')}
        </p>
      </main>
    );
  }

  return (
    <div className="relative flex min-h-[calc(100dvh-48px)] flex-col overflow-hidden bg-background">
      <BouncingBall />

      <main className="relative z-10 flex flex-1 flex-col">
        {/* Верхние кнопки */}
        <header className="flex items-center justify-between px-8 pt-8 md:px-16 md:pt-8">
          <button
            type="button"
            onClick={handleLogout}
            disabled={logoutLoading}
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
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            {logoutLoading
              ? t('home.loggingOut')
              : t('home.logout')}
          </button>

          <button
            type="button"
            onClick={() => router.push('/profile')}
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
              transition-opacity
              hover:bg-[#808979]
            "
          >
            {t('home.profile')}
          </button>
        </header>

        {/* Основной контент - белая карточка*/}
        <section className="mx-auto flex w-full max-w-[1100px] flex-1 items-center  justify-center px-8 py-12 md:px-16">
          <div
            className="
              w-full
              rounded-[10px]
              bg-white
              px-8
              py-14
              -translate-y-8
              shadow-[-8px_8px_32px_0_rgba(193,168,163,0.25)]
              md:px-12
              xl:px-[70px]
              xl:py-[80]
            "
          >
            <div className="mb-12 text-center">

              <h1 className="font-display text-[clamp(2.5rem,5vw,56px)] uppercase leading-none text-brand-red">
                {t('home.chooseGame')}
              </h1>

              <p className="mt-4 text-sm text-[#615050]">
                {t('home.selectGameMode')}
              </p>
            </div>

            <div className="grid gap-10 md:grid-cols-2 md:gap-14">
              {/* Левая часть — режимы игры */}
              <div>
                <p className="mb-4 text-sm font-bold uppercase tracking-wide text-[#615050]">
                  {t('home.gameMode')}
                </p>

                <div className="flex flex-col gap-6">
                  <button
                    type="button"
                    onClick={() => startGame('online')}
                    className="
                      h-[46px]
                      w-full
                      rounded-full
                      border
                      border-[#CFC5C1]
                      text-[14px]
                      font-medium
                      uppercase
                      text-[#615050]
                      transition-all
                      hover:border-[#615050]
                      hover:bg-[#D9D9D9]/20
                    "
                  >
                    {t('game.menu.playOnline')}
                  </button>

                  <button
                    type="button"
                    onClick={() => startGame('local')}
                    className="
                      h-[46px]
                      w-full
                      rounded-full
                      border
                      border-[#CFC5C1]
                      text-[14px]
                      font-medium
                      uppercase
                      text-[#615050]
                      transition-all
                      hover:border-[#615050]
                      hover:bg-[#D9D9D9]/20
                    "
                  >
                    {t('game.menu.playLocal')}
                  </button>

                  <button
                    type="button"
                    onClick={() => startGame('ai')}
                    className="
                      h-[46px]
                      w-full
                      rounded-full
                      border
                      border-[#CFC5C1]
                      text-[14px]
                      font-medium
                      uppercase
                      text-[#615050]
                      transition-all
                      hover:border-[#615050]
                      hover:bg-[#D9D9D9]/20
                    "
                  >
                    {t('game.menu.playAi')}
                  </button>

                  <button
                    type="button"
                    onClick={() => startGame('tournament')}
                    className="
                      h-[46px]
                      w-full
                      rounded-full
                      border
                      border-[#CFC5C1]
                      text-[14px]
                      font-medium
                      uppercase
                      text-[#615050]
                      transition-all
                      hover:border-[#615050]
                      hover:bg-[#D9D9D9]/20
                    "
                  >
                    {t('game.menu.tournament')}
                  </button>
                </div>
              </div>

              {/* Правая часть — настройки */}
              <div className="md:border-l md:border-[#EEE9E6] md:pl-14">
                <p className="mb-5 text-sm font-bold uppercase tracking-wide text-[#615050]">
                {t('game.menu.gameSettings')}{' '} <span className="lowercase font-medium">{t('game.menu.gameSettingsNote')}</span>
                </p>

                {/* Карта */}
                <div>
                  <p className="mb-3 text-sm text-[#615050]">
                  {t('game.menu.map')}
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMapId('classic')}
                      className={`
                        h-[46px]
                        rounded-full
                        border
                        text-sm
                        font-medium
                        transition-colors
                        ${
                          mapId === 'classic'
                            ? 'border-brand-green bg-brand-green text-white'
                            : 'border-[#D9D5D1] text-[#615050] hover:bg-zinc-50'
                        }
                      `}
                    >
                      {t('game.menu.classic')}
                    </button>

                    <button
                      type="button"
                      onClick={() => setMapId('obstacles')}
                      className={`
                        h-[46px]
                        rounded-full
                        border
                        text-sm
                        font-medium
                        transition-colors
                        ${
                          mapId === 'obstacles'
                            ? 'border-brand-green bg-brand-green text-white'
                            : 'border-[#D9D5D1] text-[#615050] hover:bg-zinc-50'
                        }
                      `}
                    >
                      {t('game.menu.obstacles')}
                    </button>
                  </div>
                </div>

                {/* Power-ups */}
                <div className="mt-7 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#615050]">
                    {t('game.menu.powerUps')}
                    </p>

                    <p className="mt-1 text-xs text-zinc-400">
                    {t('game.menu.powerUpsDescription')}
                    </p>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={powerups}
                    onClick={() =>
                      setPowerups((current) => !current)
                    }
                    className={`
                      relative
                      h-[30px]
                      w-[54px]
                      shrink-0
                      rounded-full
                      transition-colors
                      duration-200
                      ${
                        powerups
                          ? 'bg-brand-green'
                          : 'bg-[#D9D5D1]'
                      }
                    `}
                  >
                    <span
                      className={`
                        absolute
                        left-[3px]
                        top-[3px]
                        h-[24px]
                        w-[24px]
                        rounded-full
                        bg-white
                        shadow-sm
                        transition-transform
                        duration-200
                        ${
                          powerups
                            ? 'translate-x-[24px]'
                            : 'translate-x-0'
                        }
                      `}
                    />
                  </button>
                </div>

                {/* Сложность AI */}
                <div className="mt-7">
                  <p className="mb-3 text-sm text-[#615050]">
                  {t('game.menu.aiDifficulty')}
                  </p>

                  <div className="grid grid-cols-3 gap-2">
                    {difficulties.map((item) => {
                      const isSelected =
                        difficulty === item.value;

                      return (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() =>
                            setDifficulty(item.value)
                          }
                          className={`
                            h-[46px]
                            rounded-full
                            border
                            text-sm
                            font-medium
                            transition-colors
                            ${
                              isSelected
                                ? 'border-brand-green bg-brand-green text-white'
                                : 'border-[#D9D5D1] text-[#615050] hover:bg-zinc-50'
                            }
                          `}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}