'use client';

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import imageCompression from 'browser-image-compression';
import { toast } from 'sonner';
import Input from '@/components/input';

import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/app/lib/api';
import { updateProfileSchema } from '@/validation/auth.schema';

import { apiErrorKey } from '../lib/api-errors';

type EditProfileModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function EditProfileModal({
  open,
  onClose,
}: EditProfileModalProps) {
  const { t } = useTranslation();

  const { user, logout, refetchUser } = useAuth();

  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [username, setUsername] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');

  const [newPassword, setNewPassword] = useState('');

  const [confirmPassword, setConfirmPassword] = useState('');

  const [saveStatus, setSaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');

  const [saveError, setSaveError] = useState('');

  const [avatarStatus, setAvatarStatus] = useState<
    'idle' | 'uploading' | 'done' | 'error'
  >('idle');

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [pendingAvatar, setPendingAvatar] = useState<string | null>(null);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open || !user) {
      return;
    }
    queueMicrotask(() => {
      setUsername(user.username);
      setAvatarPreview(null);
      setPendingAvatar(null);
      setAvatarStatus('idle');
      setSaveError('');
      setFieldErrors({});
      setSaveStatus('idle');
    });
  }, [open, user]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        handleClose();
      }
    }

    document.body.style.overflow = 'hidden';

    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = '';

      window.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  if (!open || !user) {
    return null;
  }

  const avatarSrc = avatarPreview ?? user.avatarPath ?? null;

  const isOAuthUser = !user.hasPassword;

  function handleClose() {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setSaveError('');
    setFieldErrors({});
    setSaveStatus('idle');
    setAvatarStatus('idle');
    setAvatarPreview(null);
    setPendingAvatar(null);

    onClose();
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();

    setSaveError('');
    setFieldErrors({});

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
      toast.error(t('profile.fixFieldErrors'));

      return;
    }

    setSaveStatus('saving');

    try {
      const body: Record<string, string> = {
        username,
      };

      if (newPassword && currentPassword) {
        body.currentPassword = currentPassword;

        body.newPassword = newPassword;
      }

      const response = await apiFetch('/users/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));

        // const errorMessage =
        //   data?.message ??
        //   t('profile.saveFailed');

        // setSaveError(errorMessage);
        // setSaveStatus('error');
        // toast.error(errorMessage);

        const errorKey =
          apiErrorKey(data) ?? data.message ?? 'profile.saveFailed';

        setSaveError(errorKey);
        setSaveStatus('error');
        toast.error(t(errorKey));

        return;
      }

      if (pendingAvatar) {
        const avatarResponse = await apiFetch('/users/me/avatar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            avatar: pendingAvatar,
          }),
        });

        if (!avatarResponse.ok) {
          const errorMessage = t('profile.avatarUploadFailed');

          setAvatarStatus('error');
          setSaveError(errorMessage);
          setSaveStatus('error');
          toast.error(errorMessage);

          return;
        }
      }

      await refetchUser();

      setPendingAvatar(null);
      setAvatarPreview(null);
      setAvatarStatus('idle');

      setSaveStatus('saved');
      toast.success(t('profile.profileUpdated'));

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      window.setTimeout(() => {
        handleClose();
      }, 700);
    } catch {
      const errorMessage = t('profile.saveFailed');

      setSaveError(errorMessage);
      setSaveStatus('error');
      toast.error(errorMessage);
    }
  }

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setAvatarStatus('uploading');

    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 256,
        useWebWorker: true,
      });

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();

        reader.onloadend = () => {
          resolve(reader.result as string);
        };

        reader.onerror = reject;

        reader.readAsDataURL(compressed);
      });

      setAvatarPreview(base64);
      setPendingAvatar(base64);
      setAvatarStatus('done');
    } catch {
      setAvatarStatus('error');

      toast.error(t('profile.avatarUploadFailed'));
    } finally {
      event.target.value = '';
    }
  }

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <div
      className='
        fixed
        inset-0
        z-50
        flex
        items-start
        justify-center
        overflow-y-auto
        bg-[#615050]/35
        px-4
        py-4
        backdrop-blur-[2px]
        sm:py-6
        md:items-center
        md:py-8
      '
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        className='
        relative
        w-full
        max-w-[560px]
        rounded-[10px]
        bg-background
        px-5
        py-6
        shadow-[-8px_8px_32px_0_rgba(97,80,80,0.25)]
        sm:px-8
        sm:py-8
        md:px-12
        md:py-10
        '
      >
        <button
          type='button'
          onClick={handleClose}
          aria-label='Close'
          className='
            absolute
            right-5
            top-5
            flex
            h-10
            w-10
            items-center
            justify-center
            rounded-full
            border
            border-[#D9D5D1]
            text-[22px]
            text-[#615050]
            transition-colors
            hover:bg-[#D9D9D9]/20
          '
        >
          ×
        </button>

        <h2 className='pr-12 font-display text-[30px] uppercase leading-none text-brand-red sm:text-[36px] md:text-[40px]'>
          {t('game.button.editProfile')}
        </h2>

        <div className='mt-8 flex flex-col items-center'>
          <div className='relative'>
            <button
              type='button'
              onClick={() => fileRef.current?.click()}
              aria-label={t('profile.changeAvatar')}
              className='
      group
      relative
      h-28
      w-28
      overflow-hidden
      rounded-full
      bg-[#D9D5D1]
      outline-none
      transition
      hover:brightness-95
      focus:ring-2
      focus:ring-brand-red
      focus:ring-offset-2
    '
            >
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={user.username}
                  className='
          h-full
          w-full
          object-cover
          transition-transform
          group-hover:scale-105
        '
                />
              ) : (
                <span className='flex h-full w-full items-center justify-center font-display text-[44px] uppercase text-white'>
                  {user.username.charAt(0).toUpperCase()}
                </span>
              )}

              <span
                className='
        absolute
        inset-0
        bg-black/0
        transition-colors
        group-hover:bg-black/10
      '
              />
            </button>

            <div
              aria-hidden='true'
              className='
        pointer-events-none
        absolute
        bottom-0
        right-0
        flex
        h-9
        w-9
        items-center
        justify-center
        rounded-full
        border-2
        border-background
        bg-brand-red
        text-white
        shadow-sm
      '
            >
              <svg
                viewBox='0 0 24 24'
                fill='none'
                aria-hidden='true'
                className='h-4 w-4'
              >
                <path
                  d='M4 20h4l10.5-10.5a2.828 2.828 0 0 0-4-4L4 16v4Z'
                  stroke='currentColor'
                  strokeWidth='1.8'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />

                <path
                  d='m13.5 6.5 4 4'
                  stroke='currentColor'
                  strokeWidth='1.8'
                  strokeLinecap='round'
                />
              </svg>
            </div>
          </div>

          <input
            ref={fileRef}
            type='file'
            accept='image/*'
            className='hidden'
            onChange={handleAvatarChange}
          />

          <p className='mt-3 min-h-4 text-xs text-[#615050]'>
            {avatarStatus === 'uploading' && t('profile.avatarUploading')}

            {avatarStatus === 'done' && t('profile.avatarSelected')}

            {avatarStatus === 'error' && t('profile.avatarUploadFailed')}
          </p>
        </div>

        <form onSubmit={handleSave} className='mt-5 space-y-5'>
          <Input
            id='profile-username'
            name='username'
            label={t('profile.username')}
            type='text'
            value={username}
            required
            error={fieldErrors.username ? t(fieldErrors.username) : undefined}
            onValueChange={setUsername}
          />

          {!isOAuthUser && (
            <>
              <div className='border-t border-[#EEE9E6] pt-5'>
                <h3 className='text-sm font-bold uppercase tracking-wide text-[#615050]'>
                  {t('profile.changePassword')}
                </h3>
              </div>

              <Input
                id='current-password'
                name='currentPassword'
                label={t('profile.currentPassword')}
                type='password'
                value={currentPassword}
                autoComplete='current-password'
                error={
                  fieldErrors.currentPassword
                    ? t(fieldErrors.currentPassword)
                    : undefined
                }
                onValueChange={setCurrentPassword}
              />

              <Input
                id='new-password'
                name='newPassword'
                label={t('profile.newPassword')}
                type='password'
                value={newPassword}
                autoComplete='new-password'
                error={
                  fieldErrors.newPassword
                    ? t(fieldErrors.newPassword)
                    : undefined
                }
                onValueChange={setNewPassword}
              />

              <Input
                id='confirm-password'
                name='confirmPassword'
                label={t('profile.confirmPassword')}
                type='password'
                value={confirmPassword}
                autoComplete='new-password'
                error={
                  fieldErrors.confirmPassword
                    ? t(fieldErrors.confirmPassword)
                    : undefined
                }
                onValueChange={setConfirmPassword}
              />
            </>
          )}

          {saveStatus === 'error' && saveError && (
            <p className='text-center text-sm text-red-600'>{t(saveError)}</p>
          )}

          <div className='flex flex-col gap-3 pt-2 sm:flex-row'>
            <button
              type='submit'
              disabled={saveStatus === 'saving'}
              className='
                h-[46px]
                min-h-[46px]
                flex-1
                shrink-0
                rounded-full
                bg-brand-red
                px-8
                text-[14px]
                font-medium
                uppercase
                text-white
                transition-colors
                hover:bg-[#D9361F]
                disabled:cursor-not-allowed
                disabled:opacity-50
              '
            >
              {saveStatus === 'saving'
                ? t('profile.saving')
                : saveStatus === 'saved'
                  ? t('profile.saved')
                  : t('profile.saveChanges')}
            </button>

            <button
              type='button'
              onClick={handleClose}
              className='
                h-[46px]
                min-h-[46px]
                flex-1
                shrink-0
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
              {t('profile.cancel')}
            </button>
          </div>

          <button
            type='button'
            onClick={handleLogout}
            className='
              h-[46px]
              min-h[46px]
              w-full
              shrink-0
              rounded-full
              border
              border-brand-red
              px-8
              text-[14px]
              font-medium
              uppercase
              text-brand-red
              transition-colors
              hover:bg-brand-red
              hover:text-white
            '
          >
            {t('profile.logout')}
          </button>
        </form>
      </div>
    </div>
  );
}
