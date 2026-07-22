'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { registerSchema } from '@/validation/auth.schema';



export default function RegisterPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const router    = useRouter();

  const [username, setUsername] = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({}); // Clear old errors before validating again

    const result = registerSchema.safeParse({ email, username, password });

    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        errors[issue.path[0] as string] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username, email, password }),
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
    <main className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-black px-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {t('auth.createAccount')}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Field label={t('auth.username')} type="text" value={username} onChange={setUsername} />
            {fieldErrors.username && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">{t(fieldErrors.username)}</p>
            )}
          </div>

          <div>
            <Field label={t('auth.email')} type="email" value={email} onChange={setEmail} />
            {fieldErrors.email && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">{t(fieldErrors.email)}</p>
            )}
          </div>

          <div>
            <Field label={t('auth.password')} type="password" value={password} onChange={setPassword} />
            {fieldErrors.password && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">{t(fieldErrors.password)}</p>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-full bg-zinc-900 text-white font-medium hover:bg-zinc-700 disabled:opacity-50 transition-colors dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-300"
          >
            {loading ? t('auth.creating') : t('auth.register')}
          </button>
        </form>

        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {t('auth.haveAccount')}{' '}
          <a href="/login" className="font-medium text-zinc-900 dark:text-zinc-50 hover:underline">
            {t('auth.login')}
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
}