// components/NotificationListener.tsx
'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useSocket } from '@/context/SocketContext';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/app/lib/api';

export function ActionToast({
  message,
  acceptLabel,
  declineLabel,
  onAccept,
  onDecline,
}: {
  message: string;
  acceptLabel: string;
  declineLabel: string;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <div className='rounded-[10px] border border-border bg-notice p-4 shadow-[-8px_8px_32px_0_var(--card-shadow)]'>
      <p className='mb-3 text-sm font-medium text-muted-foreground'>{message}</p>
      <div className='flex justify-end gap-2'>
        <button
          type='button'
          onClick={onDecline}
          className='rounded-full bg-decline px-3 py-1 text-xs font-medium uppercase text-white transition-colors hover:bg-brand-red-dark'
        >
          {declineLabel}
        </button>
        <button
          type='button'
          onClick={onAccept}
          className='rounded-full bg-brand-green px-3 py-1 text-xs font-medium uppercase text-white transition-colors hover:bg-brand-green-dark'
        >
          {acceptLabel}
        </button>
      </div>
    </div>
  );
}

export function NotificationListener() {
  const { t } = useTranslation();
  const socket = useSocket();
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const receivedInvites = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!socket) return;

    const onFriendOnline = (data: { userId: string; username?: string }) => {
      toast.success(
        t('notification.friendOnline', {
          username: data.username ?? t('notification.friendOfflineDefault'),
        }),
      );
    };
    const onFriendOffline = (data: { userId: string; username?: string }) => {
      toast.info(
        t('notification.friendOffline', {
          username: data.username ?? t('notification.friendOfflineDefault'),
        }),
      );
    };
    const onRequestReceived = (data: {
      id: string;
      messageKey: string;
      username: string;
    }) => {
      const toastId = `friend-request-${data.id}`;

      const respond = async (action: 'accept' | 'decline') => {
        toast.dismiss(toastId);
        try {
          const res = await apiFetch(`/friends/respond/${data.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action }),
          });
          if (!res.ok) throw new Error();
          if (action === 'accept') {
            toast.success(
              t('notification.friendAdded', { username: data.username }),
            );
          }
        } catch {
          toast.error(t('friends.errors.respondFailed'));
        }
      };
      toast.custom(
        () => (
          <ActionToast
            message={t(data.messageKey, { username: data.username })}
            acceptLabel={t('notification.accept')}
            declineLabel={t('notification.decline')}
            onAccept={() => respond('accept')}
            onDecline={() => respond('decline')}
          />
        ),
        { id: toastId, duration: 15000 },
      );
    };
    const onRequestAccepted = (data: {
      messageKey: string;
      username: string;
    }) => {
      toast.success(t(data.messageKey, { username: data.username }));
    };
    const onRequestDeclined = () => {
      toast.error(t('notification.requestDeclined'));
    };
    const onFriendRemoved = (data: { messageKey: string }) => {
      toast.warning(t(data.messageKey));
    };
    const onChatMessage = (data: {
      senderId: string;
      senderUsername?: string | null;
      receiverId: string;
      text: string;
    }) => {
      if (!user || data.senderId === user.id) return;
      if (pathname === '/chat' || pathname?.startsWith('/game')) return;
      const name = data.senderUsername ?? t('chat.someone');
      toast.info(t('chat.newMessageFrom', { name }), {
        action: {
          label: t('chat.open'),
          onClick: () => router.push('/chat'),
        },
      });
    };

    const onGameInviteReceived = (data: {
      inviteId: string;
      senderUsername: string;
      gameRoomId: string;
    }) => {
      receivedInvites.current.add(data.inviteId);
      toast.custom(
        () => (
          <ActionToast
            message={t('notification.wantsToPlay', {
              username: data.senderUsername,
            })}
            acceptLabel={t('notification.accept')}
            declineLabel={t('notification.decline')}
            onAccept={() => {
              socket.emit('acceptGameInvite', { inviteId: data.inviteId });
              toast.dismiss(`invite-${data.inviteId}`);
            }}
            onDecline={() => {
              socket.emit('declineGameInvite', { inviteId: data.inviteId });
              toast.dismiss(`invite-${data.inviteId}`);
            }}
          />
        ),
        { id: `invite-${data.inviteId}`, duration: 15000 },
      );
    };

    const onGameInviteAccepted = () => {
      router.push('/game?mode=online');
    };
    const onGameInviteExpired = (data: { inviteId: string }) => {
      if (!receivedInvites.current.has(data.inviteId)) return;
      toast.dismiss(`invite-${data.inviteId}`);
      toast.error(t('friends.inviteNoLongerValid'));
    };

    socket.on('gameInviteReceived', onGameInviteReceived);
    socket.on('gameInviteAccepted', onGameInviteAccepted);
    socket.on('gameInviteExpired', onGameInviteExpired);
    socket.on('friendOnline', onFriendOnline);
    socket.on('friendOffline', onFriendOffline);
    socket.on('friendRequestReceived', onRequestReceived);
    socket.on('friendRequestAccepted', onRequestAccepted);
    socket.on('friendRequestDeclined', onRequestDeclined);
    socket.on('friendRemoved', onFriendRemoved);
    socket.on('chatMessageReceived', onChatMessage);

    return () => {
      socket.off('friendOnline', onFriendOnline);
      socket.off('friendOffline', onFriendOffline);
      socket.off('friendRequestReceived', onRequestReceived);
      socket.off('friendRequestAccepted', onRequestAccepted);
      socket.off('friendRequestDeclined', onRequestDeclined);
      socket.off('friendRemoved', onFriendRemoved);
      socket.off('gameInviteReceived', onGameInviteReceived);
      socket.off('gameInviteAccepted', onGameInviteAccepted);
      socket.off('gameInviteExpired', onGameInviteExpired);
      socket.off('chatMessageReceived', onChatMessage);
    };
  }, [socket, router, t, pathname, user]);

  return null;
}
