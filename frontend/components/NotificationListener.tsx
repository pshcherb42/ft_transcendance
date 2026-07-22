// components/NotificationListener.tsx
'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useSocket } from '@/context/SocketContext';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export function NotificationListener() {
  const { t } = useTranslation();
  const socket = useSocket();
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();

  useEffect(() => {
    if (!socket) return;

    const onFriendOnline = (data: { userId: string; username?: string }) => {
      toast.success(t('notification.friendOnline', { username: data.username ?? t('notification.friendOfflineDefault') }));
    };
    const onFriendOffline = (data: { userId: string; username?: string }) => {
      toast.info(t('notification.friendOffline', { username: data.username ?? t('notification.friendOfflineDefault') }));
    };
    const onRequestReceived = (data: { messageKey: string; username: string }) => {
      toast.info(t(data.messageKey, { username: data.username }));
    };
    const onRequestAccepted = (data: { messageKey: string; username: string }) => {
      toast.success(t(data.messageKey, { username: data.username }));
    };
    const onRequestDeclined = () => {
      toast.error(t('notification.requestDeclined'));
    };
    const onFriendRemoved = (data: { messageKey: string }) => {
      toast.warning(t(data.messageKey));
    };
    const onChatMessage = (data: { senderId: string; receiverId: string; text: string }) => {
      if (!user || data.senderId === user.id) return;
      if (pathname === '/chat') return;
      toast.info(t('chat.newMessage'));
    };

    const onGameInviteReceived = (data: { inviteId: string; senderUsername: string; gameRoomId: string }) => {
      const toastId = toast.custom(
        () => (
          <div className="bg-zinc-800 text-white p-4 rounded-lg shadow-lg border border-zinc-700">
            <p className="font-semibold mb-2">{t('notification.wantsToPlay', { username: data.senderUsername })}</p>
            <div className="flex gap-2 justify-end">
              <button
                className="text-xs px-2 py-1 rounded bg-zinc-600 text-white"
                onClick={() => {
                  socket.emit('declineGameInvite', { inviteId: data.inviteId });
                  toast.dismiss(toastId);
                }}
              >
                {t('notification.decline')}
              </button>
              <button
                className="text-xs px-2 py-1 rounded bg-emerald-600 text-white font-bold"
                onClick={() => {
                  socket.emit('acceptGameInvite', { inviteId: data.inviteId });
                  toast.dismiss(toastId);
                }}
              >
                {t('notification.accept')}
              </button>
            </div>
          </div>
        ),
        { duration: 15000 },
      );
    };

    const onGameInviteAccepted = () => {
      router.push('/game');
    };

    socket.on('gameInviteReceived', onGameInviteReceived);
    socket.on('gameInviteAccepted', onGameInviteAccepted);
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
      socket.off('chatMessageReceived', onChatMessage);
    };
  }, [socket, router, t, pathname, user]);

  return null;
}