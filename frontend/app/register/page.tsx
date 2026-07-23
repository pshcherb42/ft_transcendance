'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Input from '@/components/input';
import BouncingBall from '@/components/bouncingBall';
import { useTranslation } from 'react-i18next';

export default function RegisterPage() {
  const { login } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [usernameError, setUsernameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setUsernameError('');
    setEmailError('');
    setPasswordError('');
    setError(null);

    let hasError = false;
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!username.trim()) {
      setUsernameError('Username is required');
      hasError = true;
    }

    if (!email.trim()) {
      setEmailError(t('validation.email.required'));
      hasError = true;
    } else if (!emailPattern.test(email.trim())) {
      setEmailError(t('validation.email.invalid'));
      hasError = true;
    }

    if (!password) {
      setPasswordError(t('validation.password.required'));
      hasError = true;
    } else if (password.length < 8) {
      setPasswordError(t('validation.password.min'));
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
      if (!res.ok) { setError(data.message ?? t('auth.registrationFailed')); return; }
      await login(data.accessToken, data.refreshToken);
      router.push('/');
    } catch {
      setError(t('auth.networkError'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-[calc(100dvh-48px)] bg-background flex flex-col">
      <BouncingBall />

      {/* основной контент */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-8 md:px-16 xl:px-[108px] gap-16 max-w-[1440px] mx-auto w-full">

        {/* левая часть — заголовок */}
        <div className="flex-1">
          <span className="text-s font-bold tracking-widest text-brand-green uppercase">
            42 Transcendence
          </span>
          <h1 className="font-display uppercase leading-tight text-[clamp(2.5rem,7vw,92px)]">
            <span className="text-foreground block">{t('auth.welcome')}</span>
            <span className="text-foreground block">{t('auth.to')}</span>
            <span className="text-brand-red block">{t('auth.ourPong')}</span>
            <span className="text-foreground block">{t('auth.game')}</span>
          </h1>
          <p className="mt-6 text-[clamp(1rem,2vw,28px)] font-light text-foreground">
          {t('auth.subtitle')}
          </p>
        </div>

        {/* правая часть — форма */}
        <div className="w-full max-w-[550px] bg-white rounded-[10px] px-8 xl:px-[70px] py-[50px] shadow-[-8px_8px_32px_0_rgba(193,168,163,0.25)]">
          <h2 className="font-display text-[48px] uppercase text-brand-red mb-[32px]">
            {t('auth.register')}
          </h2>

          <form onSubmit={handleSubmit} noValidate className="space-y-[20px]">
            <Input
              id="username"
              name="username"
              label={t('auth.username')}
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (usernameError) setUsernameError('');
              }}
              placeholder="your_username"
              error={usernameError}
            />

            <Input
              id="email"
              name="email"
              label={t('auth.email')}
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError('');
              }}
              placeholder="example@gmail.com"
              error={emailError}
            />

            <Input
              id="password"
              name="password"
              label={t('auth.password')}
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError('');
              }}
              placeholder={t('auth.passwordPlaceholder')}
              error={passwordError}
            />

            {error && (
              <p className="text-[12px] leading-[16px] text-[#EE4424]">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="h-[46px] w-full rounded-[24px] bg-[#EE4424] text-[14px] font-medium text-white transition-colors hover:bg-[#D6381C] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? t('auth.creating') : t('auth.register')}
            </button>
          </form>

          <p className="mt-[20px] text-sm text-zinc-400">
            {t('auth.haveAccount')}{' '}
            <a href="/login" className="font-bold text-zinc-900 hover:underline">
            {t('auth.login')}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}