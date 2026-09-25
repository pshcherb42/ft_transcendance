'use client';

import { useState, FormEvent, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Input from '@/components/input';
import BouncingBall from '@/components/bouncingBall';
import { Trans, useTranslation } from 'react-i18next';
import { apiErrorKey } from '@/app/lib/api-errors';

function ForgotPasswordPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { t, i18n } = useTranslation();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
    if (user) router.replace('/');
  }, [router, user]);

  if (!mounted) return null;
  if (authLoading) return null;
  if (user) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setEmailError('');
    setError(null);

    const trimmedEmail = email.trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!trimmedEmail) {
      setEmailError('validation.email.required');
      return;
    }
    if (!emailPattern.test(trimmedEmail)) {
      setEmailError('validation.email.invalid');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, lang: i18n.language }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(apiErrorKey(data) ?? 'auth.networkError');
        return;
      }
      setSent(true);
    } catch {
      setError('auth.networkError');
    } finally {
      setLoading(false);
    }
  }

  function FormPanel() {
    return (
      <>
        <h2 className='mb-6 font-display text-[36px] uppercase leading-none text-brand-red sm:text-[42px]'>
          {t('auth.forgotPasswordTitle')}
        </h2>

        {sent ? (
          <p className='text-sm text-muted-foreground'>
            {t('auth.resetLinkSent')}
          </p>
        ) : (
          <>
            <p className='mb-6 text-sm text-muted-foreground'>
              {t('auth.forgotPasswordInstructions')}
            </p>

            <form onSubmit={handleSubmit} noValidate className='space-y-[20px]'>
              <Input
                id='email'
                name='email'
                label={t('auth.email')}
                type='email'
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError('');
                }}
                placeholder='example@gmail.com'
                error={emailError}
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
                {loading ? t('auth.sending') : t('auth.forgotPassword')}
              </button>
            </form>
          </>
        )}

        <p className='mt-5 text-sm text-muted-foreground'>
          <button
            type='button'
            onClick={() => router.push('/login')}
            className='font-bold text-foreground hover:underline underline-offset-4'
          >
            {t('auth.backToLogin')}
          </button>
        </p>
      </>
    );
  }

  return (
    <div className='relative flex min-h-[calc(100dvh-48px)] flex-col bg-background'>
      <BouncingBall />

      {/* Mobile / tablet */}
      <div
        className='
            relative
            z-10
            flex
            flex-1
            flex-col
            px-4
            py-8
            sm:px-6
            md:px-10
            min-[800px]:hidden
          '
      >
        <div
          className='
              mx-auto
              flex
              w-full
              max-w-[520px]
              flex-1
              flex-col
              justify-center
            '
        >
          <button
            type='button'
            onClick={() => router.push('/login')}
            aria-label='Back'
            className='
                mb-6
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-full
                border
                border-border
                text-muted-foreground
                transition-colors
                hover:bg-border/20
              '
          >
            <svg
              viewBox='0 0 24 24'
              fill='none'
              aria-hidden='true'
              className='h-5 w-5'
            >
              <path
                d='M15 18l-6-6 6-6'
                stroke='currentColor'
                strokeWidth='1.8'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
            </svg>
          </button>

          <div
            className='
                w-full
                rounded-[10px]
                bg-surface
                px-5
                py-7
                shadow-[-8px_8px_32px_0_var(--card-shadow)]
                sm:px-8
                sm:py-9
              '
          >
            {FormPanel()}
          </div>
        </div>
      </div>

      {/* main content */}
      <div
        className='
          relative
          z-10
          mx-auto
          hidden
          w-full
          max-w-[1440px]
          flex-1
          items-start
          justify-between
          gap-8
          px-8
          py-32
          min-[800px]:flex
          min-[900px]:gap-10
          min-[900px]:px-10
          lg:gap-12
          lg:px-16
          xl:gap-16
          xl:px-[108px]
        '
      >
        {/* left side — heading */}
        <div className='min-w-0 lg:flex-1'>
          <span className='text-xs font-bold tracking-widest text-brand-green uppercase sm:text-sm'>
            42 Transcendence
          </span>
          <h1
            className='
              font-display
              uppercase
              leading-[1.1]
              text-[52px]
              min-[900px]:text-[60px]
              lg:text-[72px]
              xl:text-[92px]
            '
          >
            <Trans i18nKey='auth.title'>
              <span className='text-brand-red'>nuestro Pong</span>
            </Trans>
          </h1>
          <p
            className='
            mt-5
            max-w-[520px]
            font-light
            leading-snug
            text-foreground
            text-[16px]
            min-[900px]:text-[18px]
            lg:text-[22px]
            xl:text-[28px]
          '
          >
            {t('auth.subtitle')}
          </p>
        </div>

        {/* right side — form */}
        <div
          className='
            w-full
            max-w-[380px]
            shrink-0
            rounded-[10px]
            bg-surface
            px-6
            py-8
            shadow-[-8px_8px_32px_0_var(--card-shadow)]
            min-[900px]:max-w-[420px]
            min-[900px]:px-7
            lg:max-w-[480px]
            lg:px-8
            lg:py-10
            xl:max-w-[550px]
            xl:px-[70px]
            xl:py-[50px]
          '
        >
          {FormPanel()}
        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPageRoute() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordPage />
    </Suspense>
  );
}
