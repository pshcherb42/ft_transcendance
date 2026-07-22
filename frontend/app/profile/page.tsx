'use client';

import { useState, useRef, useEffect, FormEvent, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import imageCompression from 'browser-image-compression';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/app/lib/api';
import { updateProfileSchema } from '@/validation/auth.schema';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { user, loading, logout, refetchUser } = useAuth();
  const router = useRouter();

  const [username,      setUsername]      = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword,   setNewPassword]   = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saveStatus,    setSaveStatus]    = useState<'idle'|'saving'|'saved'|'error'>('idle');
  const [saveError,     setSaveError]     = useState('');
  const [avatarStatus,  setAvatarStatus]  = useState<'idle'|'uploading'|'done'|'error'>('idle');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (user) setUsername(user.username);
  }, [user]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaveError('');
    setFieldErrors({});

    // 2. Run Zod validation schema on form inputs
    const result = updateProfileSchema.safeParse({
      username,
      currentPassword,
      newPassword,
      confirmPassword,
    });

    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        errors[issue.path[0] as string] = issue.message;
      }
      setFieldErrors(errors);
      toast.error('Por favor, revisa los campos con errores.');
      return; // 3. Stop submission if validation fails
    }

    setSaveStatus('saving');
    try {
      const body: Record<string, string> = { username };
      if (newPassword && currentPassword) {
        body.currentPassword = currentPassword;
        body.newPassword     = newPassword;
      }

      const res = await apiFetch('/users/me', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const errorMessage = data?.message ?? 'Save failed — try again';
        setSaveError(errorMessage);
        setSaveStatus('error');
        toast.error(errorMessage);
        return;
      }

      await refetchUser();
      setSaveStatus('saved');

      toast.success('¡Perfil actualizado con éxito!');

      // Clear password fields and redirect
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setSaveStatus('idle');
        router.push('/');
      }, 1000);

    } catch {
      const fallbackError = 'Save failed — try again';
      setSaveError(fallbackError);
      setSaveStatus('error');
      
      // UBICACIÓN DE ERROR 2: Error de red o servidor caído
      toast.error(fallbackError);
    }
  }

  async function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
  
    setAvatarStatus('uploading');
  
    try {
      // Compress first
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 256,   // avatar — small is fine
        useWebWorker: true,
      });
  
      // Convert to base64 data URL
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror  = reject;
        reader.readAsDataURL(compressed);
      });
  
      setAvatarPreview(base64);
  
      const res = await apiFetch('/users/me/avatar', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ avatar: base64 }),
      });
  
      if (!res.ok) { setAvatarStatus('error'); return; }
      await refetchUser();
      setAvatarStatus('done');
      setTimeout(() => setAvatarStatus('idle'), 2000);
    } catch {
      setAvatarStatus('error');
    }
  }

  function handleLogout() {
    logout();
    router.push('/login');
  }

  if (loading || !user) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-zinc-400 text-sm">Loading…</p>
      </main>
    );
  }

  const avatarSrc = avatarPreview ?? user.avatarPath ?? null;
  const isOAuthUser = !user.hasPassword; // see note below

  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-black px-4 py-12">
      <div className="w-full max-w-sm space-y-8">

        {/* Avatar */}
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative group w-24 h-24 rounded-full overflow-hidden border-2 border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50"
          >
            {avatarSrc ? (
              <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="flex items-center justify-center w-full h-full bg-zinc-100 dark:bg-zinc-800 text-3xl font-semibold text-zinc-400">
                {user.username[0].toUpperCase()}
              </span>
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-medium">
              Change
            </span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          <p className="text-xs text-zinc-400">
            {avatarStatus === 'uploading' && 'Uploading…'}
            {avatarStatus === 'done'      && 'Avatar updated ✓'}
            {avatarStatus === 'error'     && 'Upload failed'}
          </p>
        </div>

        {/* Email */}
        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">{user.email}</p>

        {/* Edit form */}
        <form onSubmit={handleSave} className="space-y-4">
          {/* Username */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              className="w-full h-10 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-sm text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50"
            />
            {fieldErrors.username && (
              <p className="text-xs text-red-600 dark:text-red-400">{fieldErrors.username}</p>
            )}
          </div>

          {/* Password change — hidden for OAuth users */}
          {!isOAuthUser && (
            <div className="space-y-3 pt-2">
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Change password</p>

              <div className="space-y-1">
                <label className="block text-xs text-zinc-500 dark:text-zinc-400">Current password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full h-10 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-sm text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50"
                />
                {fieldErrors.currentPassword && (
                  <p className="text-xs text-red-600 dark:text-red-400">{fieldErrors.currentPassword}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-xs text-zinc-500 dark:text-zinc-400">New password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full h-10 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-sm text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50"
                />
                {fieldErrors.newPassword && (
                  <p className="text-xs text-red-600 dark:text-red-400">{fieldErrors.newPassword}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-xs text-zinc-500 dark:text-zinc-400">Confirm new password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full h-10 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-sm text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50"
                />
                {fieldErrors.confirmPassword && (
                  <p className="text-xs text-red-600 dark:text-red-400">{fieldErrors.confirmPassword}</p>
                )}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={saveStatus === 'saving'}
            className="w-full h-11 rounded-full bg-zinc-900 text-white font-medium hover:bg-zinc-700 disabled:opacity-50 transition-colors dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-300"
          >
            {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved ✓' : 'Save changes'}
          </button>

          {saveStatus === 'error' && saveError && (
            <p className="text-sm text-red-600 dark:text-red-400 text-center">{saveError}</p>
          )}
        </form>

        {/* Logout */}
        <button
          type="button"
          onClick={handleLogout}
          className="w-full h-11 rounded-full border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
        >
          Log out
        </button>

      </div>
    </main>
  );
}
