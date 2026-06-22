'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';

export default function HomePage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <main className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
        <p className="text-zinc-400">Loading</p>
      </main>
    );
  }

  const avatarSrc = user.avatarPath ? user.avatarPath : null;

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
          <div className="w-20 h-20 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-2xl font-bold text-zinc-500">
            {user.username[0].toUpperCase()}
          </div>
        )}

        <div className="text-center">
          <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{user.username}</p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{user.email}</p>
        </div>

        <div className="flex gap-3 w-full pt-2">
          
            href="/profile"
            className="flex-1 h-10 rounded-full border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-sm font-medium text-zinc-900 dark:text-zinc-50 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            Profile
          </a>
          <button
            onClick={handleLogout}
            className="flex-1 h-10 rounded-full bg-zinc-900 dark:bg-zinc-50 text-white dark:text-black text-sm font-medium hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors"
          >
            Log out
          </button>
        </div>
      </div>
    </main>
  );
}
