/*'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const router    = useRouter();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? 'Login failed'); return; }
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
          Log in
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
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
            {loading ? 'Signing in…' : 'Log in'}
          </button>
        </form>

        <div className="relative flex items-center">
          <div className="flex-1 border-t border-zinc-200 dark:border-zinc-700" />
          <span className="mx-3 text-xs text-zinc-400">or</span>
          <div className="flex-1 border-t border-zinc-200 dark:border-zinc-700" />
        </div>

        <a
          href="/api/auth/google"
          className="flex items-center justify-center gap-3 w-full h-11 rounded-full border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
        >
          <GoogleIcon />
          Continue with Google
        </a>

        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No account?{' '}
          <a href="/register" className="font-medium text-zinc-900 dark:text-zinc-50 hover:underline">
            Register
          </a>
        </p>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
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

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? 'Login failed'); return; }
      await login(data.accessToken, data.refreshToken);
      router.push('/');
    } catch {
      setError('Network error — is the backend running?');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* основной контент */}
      <div className="flex flex-1 items-center px-[108px] gap-16">

        {/* левая часть — заголовок */}
        <div className="flex-1">
        <span className="text-s font-bold tracking-widest text-brand-green uppercase">
          42 Transcendence
        </span>
        <h1 className="font-display uppercase leading-[106px] text-[clamp(4rem,10vw,92px)]">
          <span className="text-foreground block">Welcome</span>
          <span className="text-foreground block">to</span>
          <span className="text-brand-red block">Our Pong</span>
          <span className="text-foreground block">Game!</span>
        </h1>
          <p className="mt-6 text-[28px] text-foreground">
            Built for the 42 Transcendence project <br /> by the best team.
          </p>
        </div>

        {/* правая часть — форма */}
        <div className="w-full max-w-[550px] bg-white rounded-[10px] p-10 shadow-sm">
        <h2 className="font-display text-[48px] uppercase text-brand-red mb-8">
          Log in
        </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1">
              <label className="text-sm text-zinc-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="anna@gmail.com"
                required
                className="w-full h-11 rounded-lg border border-zinc-200 px-4 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#e8391d]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm text-zinc-700">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••••"
                required
                className="w-full h-11 rounded-lg border border-zinc-200 px-4 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#e8391d]"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-full bg-[#e8391d] text-white font-bold uppercase tracking-widest hover:bg-[#c82d14] disabled:opacity-50 transition-colors"
            >
              {loading ? 'Signing in…' : 'Log in'}
            </button>
          </form>

          {/* разделитель */}
          <div className="relative flex items-center my-6">
            <div className="flex-1 border-t border-zinc-200" />
            <span className="mx-3 text-xs text-zinc-400">or</span>
            <div className="flex-1 border-t border-zinc-200" />
          </div>

          {/* Google */}
          <a
          href="/api/auth/google"
          className="flex items-center justify-center gap-3 w-full h-11 rounded-full border border-zinc-200 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
        >
          <GoogleIcon />
          Continue with Google
        </a>

          <p className="mt-6 text-sm text-zinc-400">
            Don't have an account?{' '}
            <a href="/register" className="font-bold text-zinc-900 hover:underline">
              Register
            </a>
          </p>
        </div>
      </div>

      {/* футер */}
      <div className="h-[48px] bg-[#EDECE8] flex justify-end items-center px-[108px] gap-[34px]">
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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}