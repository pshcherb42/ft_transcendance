
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import BouncingBall from '@/components/bouncingBall';

type Difficulty = 'easy' | 'medium' | 'hard';

const difficulties: {
  value: Difficulty;
  label: string;
}[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Normal' },
  { value: 'hard', label: 'Hard' },
];

export default function HomePage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  const [difficulty, setDifficulty] =
    useState<Difficulty>('easy');

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

  function startGame(mode: 'online' | 'local' | 'ai') {
    if (mode === 'ai') {
      router.push(
        `/game?mode=ai&difficulty=${difficulty}`,
      );
      return;
    }

    router.push(`/game?mode=${mode}`);
  }

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-zinc-400">
          Loading...
        </p>
      </main>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <BouncingBall />

      <main className="relative z-10 flex flex-1 flex-col">
        {/* Верхние кнопки */}
        <header className="flex items-center justify-between px-8 pt-8 md:px-16 xl:px-[64px] xl:pt-[64px]">
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
              ? 'Logging out...'
              : 'Log out'}
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
            Profile
          </button>
        </header>

        {/* Основной контент */}
        <section
          className="
            mx-auto
            flex
            w-full
            max-w-[1440px]
            flex-1
            items-start
            gap-12
            px-8
            py-12
            md:px-16
            xl:gap-[100px]
            xl:px-[64px]
          "
        >
          {/* Левая колонка */}
          <div className="min-w-0 flex-1">
            <span className="text-sm font-bold uppercase tracking-widest text-brand-green">
              42 Transcendence
            </span>

            <h1
              className="
                mt-8
                font-display
                text-[clamp(3rem,6vw,92px)]
                uppercase
                leading-tight
              "
            >
              <span className="block text-foreground">
                Choose
              </span>

              <span className="block text-brand-red">
                your game
              </span>

              <span className="block text-foreground">
                mode!
              </span>
            </h1>

            <p className="mt-7 max-w-[540px] text-[clamp(1rem,1.8vw,28px)] font-light leading-snug text-foreground">
              Play online, challenge a friend on the
              same keyboard or train against AI.
            </p>
          </div>

          {/* Правая карточка */}
          <div
            className="
              w-full
              max-w-[550px]
              rounded-[10px]
              bg-white
              px-8
              py-10
              shadow-[-8px_8px_32px_0_rgba(193,168,163,0.25)]
              xl:px-[70px]
              xl:py-[64px]
            "
          >
            <h2 className="font-display text-[clamp(2.4rem,4vw,48px)] uppercase leading-none text-brand-red">
              Play Pong
            </h2>

            <p className="mt-4 text-sm text-[#615050]">
              Select a game mode and start playing.
            </p>

            <div className="mt-8 flex flex-col gap-5">
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
                  hover:text-[#615050]
                "
              >
                Play online
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
                  hover:text-[#615050]
                "
              >
                Local game
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
                  hover:text-[#615050]
                "
              >
                Play against AI
              </button>
            </div>

            <div className="mt-8">
              <p className="mb-3 text-sm text-[#615050]">
                AI difficulty
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
        </section>
      </main>
    </div>
  );
}