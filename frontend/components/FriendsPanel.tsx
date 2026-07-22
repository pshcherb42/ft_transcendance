// components/FriendsPanel.tsx
'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFriends } from '@/hooks/useFriends';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/context/SocketContext';
import { useAuth } from '@/context/AuthContext';

export default function FriendsPanel() {
  const { t } = useTranslation();
  const { friends, incoming, outgoing, loading, error, sendRequest, respondToRequest, removeFriend } = useFriends();
  const socket = useSocket();
  const { user } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);

  const handleInviteToPlay = (friendId: string, friendUsername: string) => {
    if (!socket || !user) return;

    socket.emit('sendGameInvite', { receiverId: friendId, senderUsername: user.username });

    const toastId = toast.loading(t('friends.inviteSent', { username: friendUsername }), { duration: 15000 });

    const onSent = (payload: { inviteId: string; gameRoomId: string }) => {
      const onAccepted = (p: { roomId: string }) => {
        if (p.roomId !== payload.gameRoomId) return;
        toast.success(t('friends.inviteAccepted', { username: friendUsername }), { id: toastId, duration: 3000 });
        cleanup();
        router.push('/game');
      };
      const onExpired = (p: { inviteId: string }) => {
        if (p.inviteId !== payload.inviteId) return;
        toast.error(t('friends.inviteExpired', { username: friendUsername }), { id: toastId, duration: 3000 });
        cleanup();
      };
      const onDeclined = (p: { inviteId: string }) => {
        if (p.inviteId !== payload.inviteId) return;
        toast.error(t('friends.inviteDeclined', { username: friendUsername }), { id: toastId, duration: 3000 });
        cleanup();
      };
      const cleanup = () => {
        socket.off('gameInviteAccepted', onAccepted);
        socket.off('gameInviteExpired', onExpired);
        socket.off('gameInviteDeclined', onDeclined);
      };
      socket.on('gameInviteAccepted', onAccepted);
      socket.on('gameInviteExpired', onExpired);
      socket.on('gameInviteDeclined', onDeclined);
    };

    socket.once('gameInviteSent', onSent);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendError(null);
    try {
      await sendRequest(username.trim());
      setUsername('');
    } catch (err) {
      setSendError(err instanceof Error ? t(err.message) : t('friends.sendFailed'));
    }
  };

  if (loading) return <p className="text-zinc-400 text-sm">{t('friends.loading')}</p>;
  if (error) return <p className="text-red-400 text-sm">{t(error)}</p>;

  return (
    <div className="flex flex-col gap-6 max-w-md">
      <form onSubmit={handleSend} className="flex gap-2">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder={t('friends.usernamePlaceholder')}
          className="flex-1 h-10 rounded-lg bg-zinc-800 text-white px-3 text-sm outline-none"
        />
        <button type="submit" className="h-10 px-4 rounded-lg bg-white text-black text-sm font-medium">
          {t('friends.add')}
        </button>
      </form>
      {sendError && <p className="text-red-400 text-xs -mt-4">{sendError}</p>}

      {incoming.length > 0 && (
        <div>
          <h3 className="text-zinc-300 text-sm font-semibold mb-2">{t('friends.incomingRequests')}</h3>
          <ul className="flex flex-col gap-2">
            {incoming.map((req) => (
              <li key={req.id} className="flex items-center justify-between bg-zinc-800 rounded-lg px-3 py-2">
                <span className="text-white text-sm">{req.sender.username}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => respondToRequest(req.id, 'accept')}
                    className="text-xs px-2 py-1 rounded bg-emerald-600 text-white"
                  >
                    {t('friends.accept')}
                  </button>
                  <button
                    onClick={() => respondToRequest(req.id, 'decline')}
                    className="text-xs px-2 py-1 rounded bg-zinc-600 text-white"
                  >
                    {t('friends.decline')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {outgoing.length > 0 && (
        <div>
          <h3 className="text-zinc-300 text-sm font-semibold mb-2">{t('friends.outgoingRequests')}</h3>
          <ul className="flex flex-col gap-2">
            {outgoing.map((req) => (
              <li key={req.id} className="text-zinc-400 text-sm bg-zinc-800/50 rounded-lg px-3 py-2">
                {req.receiver.username} — {t('friends.pending')}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3 className="text-zinc-300 text-sm font-semibold mb-2">{t('friends.friendsCount', { count: friends.length })}</h3>
        <ul className="flex flex-col gap-2">
          {friends.map((f) => (
            <li key={f.friendshipId} className="flex items-center justify-between bg-zinc-800 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${f.online ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
              <span className="text-white text-sm">{f.username}</span>
            </div>
            <div className="flex items-center gap-2">
              {f.online && (
                <button
                  onClick={() => handleInviteToPlay(f.id, f.username)}
                  className="text-xs px-2 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-500"
                >
                  {t('friends.play')}
                </button>
              )}
              <button
                onClick={() => removeFriend(f.friendshipId)}
                className="text-xs text-zinc-400 hover:text-red-400"
              >
                {t('friends.remove')}
              </button>
            </div>
          </li>
          ))}
        </ul>
      </div>
    </div>
  );
}