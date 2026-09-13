'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';

export default function OAuthCallbackPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { login }    = useAuth();
  const { t }         = useTranslation();

  useEffect(() => {
    const accessToken  = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');

    if (!accessToken || !refreshToken) {
      router.replace('/login?error=oauth_failed');
      return;
    }

    login(accessToken, refreshToken).then(() => router.replace('/'));
  }, [searchParams, router, login]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-muted-foreground">{t('auth.signingIn')}</p>
    </div>
  );
}
