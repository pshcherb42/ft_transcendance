// components/NotificationListener.tsx
'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { useSocket } from '@/context/SocketContext';
import { useRouter } from 'next/navigation';

export function NotificationListener() {
  const socket = useSocket();
  const router = useRouter();

  useEffect(() => {
    if (!socket) return;

    const onFriendOnline = (data: { userId: string; username?: string }) => {
      toast.success(`${data.username ?? 'A friend'} is now online`);
    };
    const onFriendOffline = (data: { userId: string; username?: string }) => {
      toast.info(`${data.username ?? 'A friend'} went offline`);
    };
    const onRequestReceived = (data: { message: string }) => {
      toast.info(data.message);
    };
    const onRequestAccepted = (data: { message: string }) => {
      toast.success(data.message);
    };
    const onRequestDeclined = () => {
      toast.error('Your friend request was declined');
    };
    const onFriendRemoved = (data: { message: string }) => {
      toast.warning(data.message);
    };

    const onGameInviteReceived = (data: { inviteId: string; senderUsername: string; gameRoomId: string }) => {
        const toastId = toast.custom(
            () => (
            <div className="bg-zinc-800 text-white p-4 rounded-lg shadow-lg border border-zinc-700">
                <p className="font-semibold mb-2">{data.senderUsername} wants to play!</p>
                <div className="flex gap-2 justify-end">
                <button
                    className="text-xs px-2 py-1 rounded bg-zinc-600 text-white"
                    onClick={() => {
                    socket.emit('declineGameInvite', { inviteId: data.inviteId });
                    toast.dismiss(toastId);
                    }}
                >
                    Rechazar
                </button>
                <button
                    className="text-xs px-2 py-1 rounded bg-emerald-600 text-white font-bold"
                    onClick={() => {
                    socket.emit('acceptGameInvite', { inviteId: data.inviteId });
                    toast.dismiss(toastId);
                    }}
                >
                    Aceptar
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

    return () => {
      socket.off('friendOnline', onFriendOnline);
      socket.off('friendOffline', onFriendOffline);
      socket.off('friendRequestReceived', onRequestReceived);
      socket.off('friendRequestAccepted', onRequestAccepted);
      socket.off('friendRequestDeclined', onRequestDeclined);
      socket.off('friendRemoved', onFriendRemoved);
      socket.off('gameInviteReceived', onGameInviteReceived);
      socket.off('gameInviteAccepted', onGameInviteAccepted);
    };
  }, [socket, router]);

  return null;
}