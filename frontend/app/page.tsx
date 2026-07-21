/*'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function HomePage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <main className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
        <p className="text-zinc-400">Loading</p>
      </main>
    );
  }

  const avatarSrc = user.avatarPath || null;

  function handleLogout() {
    logout();
    router.push('/login');
  }

  return (
      <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 dark:bg-black px-4">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 w-full max-w-sm shadow-sm">
          {avatarSrc ? (
            <Image
              src={avatarSrc}
              alt="avatar"
              width={80}
              height={80}
              className="rounded-full object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-zinc-200 text-2xl font-bold text-zinc-500 dark:bg-zinc-700">
              {user.username[0].toUpperCase()}
            </div>
          )}

          <div className="text-center">
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {user.username}
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {user.email}
            </p>
          </div>

          <Link
            href="/game"
            className="flex h-11 w-full items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-300"
          >
            Jugar
          </Link>

          <div className="flex w-full gap-3">
            <Link
              href="/profile"
              className="flex h-10 flex-1 items-center justify-center rounded-full border border-zinc-200 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-800"
            >
              Profile
            </Link>
            <Link
              href="/friends"
              className="flex h-10 flex-1 items-center justify-center rounded-full border border-zinc-200 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-800"
            >
              Amigos
            </Link>
            <Link
              href="/stats"
              className="flex h-10 flex-1 items-center justify-center rounded-full border border-zinc-200 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-800"
            >
              Stats
            </Link>
          </div>

         <button
          onClick={handleLogout}
          className="flex h-10 w-full items-center justify-center rounded-full border border-zinc-200 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-800"
        >
          Log out
        </button>
      </div>
    </main>
  );
}*/

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

      <footer className="flex h-[48px] items-center justify-end gap-[34px] bg-[#EDECE8] px-8 md:px-16 xl:px-[108px]">
        <a
          href="/terms"
          className="text-xs uppercase tracking-widest text-[#615050] hover:underline underline-offset-4"
        >
          Terms of Service
        </a>

        <span className="text-[#B5ACAC]">|</span>

        <a
          href="/privacy"
          className="text-xs uppercase tracking-widest text-[#615050] hover:underline underline-offset-4"
        >
          Privacy Policy
        </a>
      </footer>
    </div>
  );
}