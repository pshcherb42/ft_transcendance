'use client';

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
}