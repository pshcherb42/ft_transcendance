/*'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function RegisterPage() {
  const { login } = useAuth();
  const router    = useRouter();

  const [username, setUsername] = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username, email, password }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.message ?? 'Registration failed'); return; }

      await login(data.accessToken, data.refreshToken);
      router.push('/');
    } catch {
      setError('Network error — is the backend running?');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-black px-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Create account
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Username" type="text"     value={username} onChange={setUsername} />
          <Field label="Email"    type="email"    value={email}    onChange={setEmail}    />
          <Field label="Password" type="password" value={password} onChange={setPassword} />

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-full bg-zinc-900 text-white font-medium hover:bg-zinc-700 disabled:opacity-50 transition-colors dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-300"
          >
            {loading ? 'Creating…' : 'Register'}
          </button>
        </form>

        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Already have an account?{' '}
          <a href="/login" className="font-medium text-zinc-900 dark:text-zinc-50 hover:underline">
            Log in
          </a>
        </p>
      </div>
    </main>
  );
}

function Field({
  label, type, value, onChange,
}: {
  label: string; type: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        required
        className="w-full h-10 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-sm text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50"
      />
    </div>
  );
}*/

'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Input from '@/components/input';
import BouncingBall from '@/components/bouncingBall';

export default function RegisterPage() {
  const { login } = useAuth();
  const router = useRouter();

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
      setEmailError('Email is required');
      hasError = true;
    } else if (!emailPattern.test(email.trim())) {
      setEmailError('Please enter a valid email');
      hasError = true;
    }

    if (!password) {
      setPasswordError('Password is required');
      hasError = true;
    } else if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
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
      if (!res.ok) { setError(data.message ?? 'Registration failed'); return; }
      await login(data.accessToken, data.refreshToken);
      router.push('/');
    } catch {
      setError('Network error — is the backend running?');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-background flex flex-col">
      <BouncingBall />

      {/* основной контент */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-8 md:px-16 xl:px-[108px] gap-16 max-w-[1440px] mx-auto w-full">

        {/* левая часть — заголовок */}
        <div className="flex-1">
          <span className="text-s font-bold tracking-widest text-brand-green uppercase">
            42 Transcendence
          </span>
          <h1 className="font-display uppercase leading-tight text-[clamp(2.5rem,7vw,92px)]">
            <span className="text-foreground block">Welcome</span>
            <span className="text-foreground block">to</span>
            <span className="text-brand-red block">Our Pong</span>
            <span className="text-foreground block">Game!</span>
          </h1>
          <p className="mt-6 text-[clamp(1rem,2vw,28px)] font-light text-foreground">
            Built for the 42 Transcendence project <br /> by the best team.
          </p>
        </div>

        {/* правая часть — форма */}
        <div className="w-full max-w-[550px] bg-white rounded-[10px] px-8 xl:px-[70px] py-[50px] shadow-[-8px_8px_32px_0_rgba(193,168,163,0.25)]">
          <h2 className="font-display text-[48px] uppercase text-brand-red mb-[32px]">
            Registration
          </h2>

          <form onSubmit={handleSubmit} noValidate className="space-y-[20px]">
            <Input
              id="username"
              name="username"
              label="Username"
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
              label="Email"
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
              label="Password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError('');
              }}
              placeholder="Min. 8 characters"
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
              {loading ? 'Creating account...' : 'Register'}
            </button>
          </form>

          <p className="mt-[20px] text-sm text-zinc-400">
            Already have an account?{' '}
            <a href="/login" className="font-bold text-zinc-900 hover:underline">
              Log in
            </a>
          </p>
        </div>
      </div>

      {/* футер */}
      <div className="h-[48px] bg-[#EDECE8] flex justify-end items-center px-8 md:px-16 xl:px-[108px] gap-[34px]">
        <a href="/terms" className="text-xs text-[#615050] uppercase tracking-widest hover:text-zinc-600">
          Terms of Service
        </a>
        <span className="text-[#B5ACAC]">|</span>
        <a href="/privacy" className="text-xs text-[#615050] uppercase tracking-widest hover:text-zinc-600">
          Privacy Policy
        </a>
      </div>

    </div>
  );
}