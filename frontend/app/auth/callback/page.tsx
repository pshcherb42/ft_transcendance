'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function OAuthCallbackPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { login }    = useAuth();

  useEffect(() => {
    const accessToken  = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');

    if (!accessToken || !refreshToken) {
      router.replace('/login?error=oauth_failed');
      return;
    }

    login(accessToken, refreshToken);
    router.replace('/');
  }, [searchParams, router, login]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-zinc-500">Signing you in…</p>
    </div>
  );
}
