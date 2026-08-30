'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Input from '@/components/input';
import BouncingBall from '@/components/bouncingBall';
import { Trans, useTranslation } from 'react-i18next';
import { apiErrorKey } from '@/app/lib/api-errors';
import { isLoggedIn } from '@/app/lib/auth';

export default function RegisterPage() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  const [mobileFormOpen, setMobileFormOpen] = useState(
    searchParams.get('form') === 'open',
  );

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [usernameError, setUsernameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
    if (isLoggedIn()) router.replace('/');
  }, [router]);

  if (!mounted) return null;

  if (isLoggedIn()) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setUsernameError('');
    setEmailError('');
    setPasswordError('');
    setError(null);

    let hasError = false;
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!username.trim()) {
      setUsernameError('validation.username.required');
      hasError = true;
    }

    if (!email.trim()) {
      setEmailError('validation.email.required');
      hasError = true;
    } else if (!emailPattern.test(email.trim())) {
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

    if (hasError) return;

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          apiErrorKey(data) ?? data.message ?? 'auth.registrationFailed',
        );
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
        {!mobileFormOpen ? (
          <div
            className='
              flex
              w-full
              max-w-[720px]
              flex-1
              flex-col
              justify-start
              pt-8
              sm:pt-12
              md:pt-16
            '
          >
            <span className='text-xs font-bold uppercase tracking-widest text-brand-green'>
              42 Transcendence
            </span>

            <h1
              className='
                mt-4
                font-display
                text-[72px]
                uppercase
                leading-[1.1]
                max-[600px]:text-[64px]
                max-[480px]:text-[56px]
                max-[400px]:text-[48px]
                max-[350px]:text-[42px]
              '
            >
              {/* Old title (4 spans) — temporarily commented out
                <span className="block text-foreground">
                  {t('auth.welcome')}
                </span>

                <span className="block text-foreground">
                  {t('auth.to')}
                </span>

                <span className="block text-brand-red">
                  {t('auth.ourPong')}
                </span>

                <span className="block text-foreground">
                  {t('auth.game')}
                </span>
                */}
              <Trans i18nKey='auth.title'>
                <span className='text-brand-red'>nuestro Pong</span>
              </Trans>
            </h1>

            <p
              className='
                mt-5
                max-w-[720px]
                font-light
                leading-snug
                text-foreground
                text-[clamp(1rem,2.4vw,1.75rem)]
              '
            >
              {t('auth.subtitle')}
            </p>

            <div className='mt-10 flex flex-col gap-3'>
              <button
                type='button'
                onClick={() => router.push('/login')}
                className='
                  h-[48px]
                  w-full
                  rounded-full
                  bg-brand-red
                  px-8
                  text-[14px]
                  font-medium
                  uppercase
                  text-white
                  transition-colors
                  hover:bg-[#D6381C]
                '
              >
                {t('auth.login')}
              </button>

              <button
                type='button'
                onClick={() => setMobileFormOpen(true)}
                className='
                  h-[48px]
                  w-full
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
                '
              >
                {t('auth.createAccount')}
              </button>
            </div>
          </div>
        ) : (
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
              onClick={() => setMobileFormOpen(false)}
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
                border-[#D9D5D1]
                text-[#615050]
                transition-colors
                hover:bg-[#D9D9D9]/20
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
                bg-white
                px-5
                py-7
                shadow-[-8px_8px_32px_0_rgba(193,168,163,0.20)]
                sm:px-8
                sm:py-9
              '
            >
              <h2 className='mb-6 font-display text-[36px] uppercase leading-none text-brand-red sm:text-[42px]'>
                {t('auth.register')}
              </h2>

              <form
                onSubmit={handleSubmit}
                noValidate
                className='space-y-[20px]'
              >
                <Input
                  id='mobile-username'
                  name='username'
                  label={t('auth.username')}
                  type='text'
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);

                    if (usernameError) {
                      setUsernameError('');
                    }
                  }}
                  placeholder='your_username'
                  error={usernameError}
                />

                <Input
                  id='mobile-register-email'
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
                  id='mobile-register-password'
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

                {error && (
                  <p className='text-[12px] leading-[16px] text-[#EE4424]'>
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
                    bg-[#EE4424]
                    text-[14px]
                    font-medium
                    text-white
                    transition-colors
                    hover:bg-[#D6381C]
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                  '
                >
                  {loading ? t('auth.creating') : t('auth.register')}
                </button>
              </form>

              <p className='mt-5 text-center text-sm text-zinc-400'>
                {t('auth.haveAccount')}{' '}
                <button
                  type='button'
                  onClick={() => router.push('/login?form=open')}
                  className='font-bold text-zinc-900 hover:underline'
                >
                  {t('auth.login')}
                </button>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* основной контент */}
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
        {/* левая часть — заголовок */}
        <div className='min-w-0 lg:flex-1'>
          <span className='text-xs font-bold uppercase tracking-widest text-brand-green sm:text-sm'>
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
            <span className="block text-foreground">
              {t('auth.welcome')}
            </span>

            <span className="block text-foreground">
              {t('auth.to')}
            </span>

            <span className="block text-brand-red">
              {t('auth.ourPong')}
            </span>

            <span className="block text-foreground">
              {t('auth.game')}
            </span>
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

        {/* правая часть — форма */}
        <div
          className='
            w-full
            max-w-[380px]
            shrink-0
            rounded-[10px]
            bg-white
            px-6
            py-8
            shadow-[-8px_8px_32px_0_rgba(193,168,163,0.25)]
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
            {t('auth.register')}
          </h2>

          <form onSubmit={handleSubmit} noValidate className='space-y-[20px]'>
            <Input
              id='username'
              name='username'
              label={t('auth.username')}
              type='text'
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (usernameError) setUsernameError('');
              }}
              placeholder='your_username'
              error={usernameError}
            />

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

            <Input
              id='password'
              name='password'
              label={t('auth.password')}
              type='password'
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError('');
              }}
              placeholder={t('auth.passwordPlaceholder')}
              error={passwordError}
            />

            {error && (
              <p className='text-[12px] leading-[16px] text-[#EE4424]'>
                {t(error)}
              </p>
            )}

            <button
              type='submit'
              disabled={loading}
              className='h-[46px] w-full rounded-[24px] bg-[#EE4424] text-[14px] font-medium text-white transition-colors hover:bg-[#D6381C] disabled:cursor-not-allowed disabled:opacity-60'
            >
              {loading ? t('auth.creating') : t('auth.register')}
            </button>
          </form>

          <p className='mt-[20px] text-sm text-zinc-400'>
            {t('auth.haveAccount')}{' '}
            <a
              href='/login'
              className='font-bold text-zinc-900 hover:underline'
            >
              {t('auth.login')}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
