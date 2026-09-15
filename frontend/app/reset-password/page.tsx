'use client';

import { Suspense, useEffect } from 'react';
import { useState, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Input from '@/components/input';
import BouncingBall from '@/components/bouncingBall';
import { useTranslation } from 'react-i18next';
import { apiErrorKey } from '../lib/api-errors';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { t } = useTranslation();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) router.replace('/login');
  }, [token, router]);

  if (!token) return null;
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPasswordError('');
    setConfirmError('');
    setError(null);

    if (newPassword.length < 8) {
      setPasswordError('validation.password.min');
      return;
    }
    if (newPassword !== confirmPassword) {
      setConfirmError('validation.confirmPassword.mismatch');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(apiErrorKey(data) ?? 'auth.networkError');
        return;
      }
      setDone(true);
    } catch {
      setError('auth.networkError');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className='relative flex min-h-[calc(100dvh-48px)] flex-col bg-background'>
      <BouncingBall />
      <div className='relative z-10 mx-auto flex w-full max-w-[480px] flex-1 flex-col justify-center px-4 py-16 sm:px-6'>
        <div className='w-full rounded-[10px] bg-surface px-6 py-8 shadow-[-8px_8px_32px_0_var(--card-shadow)] sm:px-8'>
          <h2 className='mb-3 font-display text-[34px] uppercase leading-none text-brand-red sm:text-[38px]'>
            {t('auth.resetPasswordTitle')}
          </h2>

          {done ? (
            <p className='text-sm text-muted-foreground'>
              {t('auth.resetSuccess')}
            </p>
          ) : (
            <form onSubmit={handleSubmit} noValidate className='space-y-[20px]'>
              <Input
                id='newPassword'
                name='newPassword'
                label={t('profile.newPassword')}
                type='password'
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (passwordError) setPasswordError('');
                }}
                error={passwordError}
              />
              <Input
                id='confirmPassword'
                name='confirmPassword'
                label={t('profile.confirmPassword')}
                type='password'
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (confirmError) setConfirmError('');
                }}
                error={confirmError}
              />
              {error && (
                <p className='text-[12px] leading-[16px] text-brand-red'>
                  {t(error)}
                </p>
              )}
              <button
                type='submit'
                disabled={loading}
                className='
                h-[46px]
                w-full
                rounded-full
                bg-brand-red
                text-[14px]
                font-medium
                text-white
                transition-colors
                hover:bg-brand-red-dark
                disabled:cursor-not-allowed
                disabled:opacity-60
                '
              >
                {loading ? t('auth.sending') : t('auth.resetPasswordTitle')}
              </button>
            </form>
          )}

          {done && (
            <p className='mt-5 text-center text-sm text-muted-foreground'>
              <Link
                href='/login'
                className='font-bold text-foreground hover:underline'
              >
                {t('auth.backToLogin')}
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
