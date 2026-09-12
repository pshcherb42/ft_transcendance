'use client';

import { notFound } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { ActionToast } from '@/components/NotificationListener';

if (process.env.NODE_ENV === 'production') notFound();

export default function DebugToastsPage() {
  const { t } = useTranslation();

  const buttons: { label: string; fire: () => void }[] = [
    {
      label: 'Friend online',
      fire: () =>
        toast.success(t('notification.friendOnline', { username: 'Alice' })),
    },
    {
      label: 'Friend offline',
      fire: () =>
        toast.info(t('notification.friendOffline', { username: 'Alice' })),
    },
    {
      label: 'Friend request received',
      fire: () =>
        toast.custom(() => (
          <ActionToast
            message={t('friends.notify.requestReceived', { username: 'Alice' })}
            acceptLabel={t('notification.accept')}
            declineLabel={t('notification.decline')}
            onAccept={() =>
              toast.success(
                t('notification.friendAdded', { username: 'Alice' }),
              )
            }
            onDecline={() => {}}
          />
        )),
    },
    {
      label: 'Friend request accepted',
      fire: () =>
        toast.success(
          t('friends.notify.requestAccepted', { username: 'Alice' }),
        ),
    },
    {
      label: 'Friend request declined',
      fire: () => toast.error(t('notification.requestDeclined')),
    },
    {
      label: 'Friend removed',
      fire: () => toast.warning(t('friends.notify.removed')),
    },
    {
      label: 'Chat message',
      fire: () =>
        toast.info(t('chat.newMessageFrom', { name: 'Alice' }), {
          action: { label: t('chat.open'), onClick: () => {} },
        }),
    },
    {
      label: 'Game invite',
      fire: () =>
        toast.custom(() => (
          <ActionToast
            message={t('notification.wantsToPlay', { username: 'Bob' })}
            acceptLabel={t('notification.accept')}
            declineLabel={t('notification.decline')}
            onAccept={() => {}}
            onDecline={() => {}}
          />
        )),
    },
    {
      label: 'Invite expired',
      fire: () => toast.error(t('friends.inviteNoLongerValid')),
    },
  ];

  return (
    <main className='flex min-h-screen flex-col gap-3 bg-background p-10'>
      <h1 className='mb-2 font-display text-2xl uppercase text-brand-red'>
        Toast preview
      </h1>
      {buttons.map((b) => (
        <button
          key={b.label}
          onClick={b.fire}
          className='w-fit rounded-full border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-surface'
        >
          {b.label}
        </button>
      ))}
    </main>
  );
}
