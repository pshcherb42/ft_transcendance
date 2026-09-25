'use client';

import { useState, FormEvent, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Input from '@/components/input';
import BouncingBall from '@/components/bouncingBall';
import { Trans, useTranslation } from 'react-i18next';
import { apiErrorKey } from '@/app/lib/api-errors';

function LoginPage() {
  const { login, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

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
    setPasswordError('');
    setError(null);

    let hasError = false;

    const trimmedEmail = email.trim();

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!trimmedEmail) {
      setEmailError('validation.email.required');
      hasError = true;
    } else if (!emailPattern.test(trimmedEmail)) {
      setEmailError('validation.email.invalid');
      hasError = true;
    }

    if (!password) {
      setPasswordError('validation.password.required');
      hasError = true;
    } else if (password.length < 8) {
      setPasswordError('validation.password.min');
      hasError = true;
    }

    if (hasError) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(apiErrorKey(data) ?? data.message ?? 'auth.loginFailed');
        return;
      }
      await login(data.accessToken, data.refreshToken);
      router.push('/');
    } catch {
      setError(t('auth.networkError'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className='relative min-h-[calc(100dvh-48px)] bg-background flex flex-col'>
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
            <h2 className='mb-6 font-display text-[36px] uppercase leading-none text-brand-red sm:text-[42px]'>
              {t('auth.login')}
            </h2>

            <form onSubmit={handleSubmit} noValidate className='space-y-[20px]'>
              <Input
                id='mobile-email'
                name='email'
                label={t('auth.email')}
                type='email'
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);

                  if (emailError) {
                    setEmailError('');
                  }
                }}
                placeholder='example@gmail.com'
                error={emailError}
              />

              <Input
                id='mobile-password'
                name='password'
                label={t('auth.password')}
                type='password'
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);

                  if (passwordError) {
                    setPasswordError('');
                  }
                }}
                placeholder={t('auth.passwordPlaceholder')}
                error={passwordError}
              />

              <p className='-mt-4 text-right text-sm'>
                <button
                  type='button'
                  onClick={() => router.push('/forgot-password')}
                  className='underline text-muted-foreground underline-offset-4'
                >
                  {t('auth.forgotPassword')}
                </button>
              </p>

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
                {loading ? t('auth.signingIn') : t('auth.login')}
              </button>
            </form>

            <div className='relative my-[20px] flex items-center'>
              <div className='flex-1 border-t border-border' />

              <span className='mx-3 text-xs text-muted-foreground'>
                {t('auth.or')}
              </span>

              <div className='flex-1 border-t border-border' />
            </div>

            <a
              href='/api/auth/google'
              className='
                  flex
                  h-[46px]
                  w-full
                  items-center
                  justify-center
                  gap-3
                  rounded-full
                  border
                  border-border
                  text-sm
                  font-medium
                  text-muted-foreground
                  transition-colors
                  hover:bg-border/20
                '
            >
              <GoogleIcon />
              {t('auth.continueWithGoogle')}
            </a>

            <p className='mt-5 text-center text-sm text-muted-foreground'>
              {t('auth.noAccount')}{' '}
              <button
                type='button'
                onClick={() => router.push('/register?form=open')}
                className='font-bold text-foreground hover:underline underline-offset-4'
              >
                {t('auth.createAccount')}
              </button>
            </p>
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
            {/* Old title (4 spans) — temporarily commented out
          <span className="text-foreground block">{t('auth.welcome')}</span>
          <span className="text-foreground block">{t('auth.to')}</span>
          <span className="text-brand-red block">{t('auth.ourPong')}</span>
          <span className="text-foreground block">{t('auth.game')}</span>
          */}
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
          <h2
            className='
              mb-6
              font-display
              uppercase
              leading-none
              text-brand-red
              text-[34px]
              min-[900px]:text-[38px]
              lg:text-[42px]
              xl:mb-8
              xl:text-[48px]
            '
          >
            {t('auth.login')}
          </h2>

          <form onSubmit={handleSubmit} noValidate className='space-y-[20px]'>
            <Input
              id='email'
              name='email'
              label={t('auth.email')}
              type='email'
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);

                if (emailError) {
                  setEmailError('');
                }
              }}
              placeholder='example@gmail.com'
              error={emailError}
            />

            <Input
              id='password'
              name='password'
              label={t('auth.password')}
              type='password'
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);

                if (passwordError) {
                  setPasswordError('');
                }
              }}
              placeholder={t('auth.passwordPlaceholder')}
              error={passwordError}
            />
            <p className='-mt-4 text-right text-sm'>
              <button
                type='button'
                onClick={() => router.push('/forgot-password')}
                className='text-muted-foreground underline-offset-4 hover:underline'
              >
                {t('auth.forgotPassword')}
              </button>
            </p>

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
              rounded-[24px]
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
              {loading ? t('auth.signingIn') : t('auth.login')}
            </button>
          </form>

          {/* divider */}
          <div className='relative flex items-center my-[20px]'>
            <div className='flex-1 border-t border-border' />
            <span className='mx-3 text-xs text-muted-foreground'>
              {t('auth.or')}
            </span>
            <div className='flex-1 border-t border-border' />
          </div>

          {/* Google */}
          <a
            href='/api/auth/google'
            className='flex items-center justify-center gap-3 w-full h-11 rounded-full border border-border text-sm font-medium text-muted-foreground hover:bg-border/20 transition-colors'
          >
            <GoogleIcon />
            {t('auth.continueWithGoogle')}
          </a>

          <p className='mt-[20px] text-sm text-muted-foreground'>
            {t('auth.noAccount')}{' '}
            <a
              href='/register'
              className='font-bold text-foreground hover:underline underline-offset-4'
            >
              {t('auth.createAccount')}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg
      width='18'
      height='18'
      viewBox='0 0 18 18'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path
        d='M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z'
        fill='#4285F4'
      />
      <path
        d='M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z'
        fill='#34A853'
      />
      <path
        d='M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z'
        fill='#FBBC05'
      />
      <path
        d='M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z'
        fill='#EA4335'
      />
    </svg>
  );
}

export default function LoginPageRoute() {
  return (
    <Suspense fallback={null}>
      <LoginPage />
    </Suspense>
  );
}
