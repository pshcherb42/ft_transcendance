'use client';

import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useSocket } from '@/context/SocketContext';
import { useAuth } from '@/context/AuthContext';

export function useGameInvite() {
  const socket = useSocket();
  const { user } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();

  const inviteToPlay = (friendId: string, friendUsername: string) => {
    if (!socket || !user) return;

    socket.emit('sendGameInvite', {
      receiverId: friendId,
      senderUsername: user.username,
    });
    const toastId = toast.loading(
      t('friends.inviteSent', { username: friendUsername }),
      { duration: 15000 },
    );

    const onSent = (payload: { inviteId: string; gameRoomId: string }) => {
      const cleanup = () => {
        socket.off('gameInviteAccepted', onAccepted);
        socket.off('gameInviteExpired', onExpired);
        socket.off('gameInviteDeclined', onDeclined);
      };
      const onAccepted = (p: { roomId: string }) => {
        if (p.roomId !== payload.gameRoomId) return;
        toast.success(
          t('friends.inviteAccepted', { username: friendUsername }),
          { id: toastId, duration: 3000 },
        );
        cleanup();
        router.push('/game?mode=online');
      };
      const onExpired = (p: { inviteId: string }) => {
        if (p.inviteId !== payload.inviteId) return;
        toast.error(t('friends.inviteExpired', { username: friendUsername }), {
          id: toastId,
          duration: 3000,
        });
        cleanup();
      };
      const onDeclined = (p: { inviteId: string }) => {
        if (p.inviteId !== payload.inviteId) return;
        toast.error(t('friends.inviteDeclined', { username: friendUsername }), {
          id: toastId,
          duration: 3000,
        });
        cleanup();
      };
      socket.on('gameInviteAccepted', onAccepted);
      socket.on('gameInviteExpired', onExpired);
      socket.on('gameInviteDeclined', onDeclined);
    };

    const onFailed = () => {
      socket.off('gameInviteSent', onSent);
      toast.error(t('friends.inviteFailed', { username: friendUsername }), {
        id: toastId,
        duration: 3000,
      });
    };

    socket.once(
      'gameInviteSent',
      (payload: { inviteId: string; gameRoomId: string }) => {
        socket.off('gameInviteFailed', onFailed);
        onSent(payload);
      },
    );
    socket.once('gameInviteFailed', onFailed);
  };

  return { inviteToPlay };
}
