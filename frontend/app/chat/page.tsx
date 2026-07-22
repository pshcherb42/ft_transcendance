'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { useFriends } from '@/hooks/useFriends';
import { useChat } from '@/hooks/useChat';
import { useGameInvite } from '@/hooks/useGameInvite';

export default function ChatPage() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const router = useRouter();
  const { friends, loading: friendsLoading } = useFriends();
  const { conversations, loadHistory, sendMessage } = useChat(user?.id);
  const { inviteToPlay } = useGameInvite();

  const [activeFriendId, setActiveFriendId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <main className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
        <p className="text-zinc-400">{t('home.loading')}</p>
      </main>
    );
  }

  const onlineFriends = friends.filter((f) => f.online);
  const activeFriend = friends.find((f) => f.id === activeFriendId);
  const messages = activeFriendId ? conversations[activeFriendId] ?? [] : [];

  const selectFriend = (friendId: string) => {
    setActiveFriendId(friendId);
    if (!conversations[friendId]) loadHistory(friendId);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFriendId || !draft.trim()) return;
    sendMessage(activeFriendId, draft);
    setDraft('');
  };

  return (
    <div className="min-h-screen bg-gray-900 flex">
      <aside className="w-64 border-r border-zinc-800 p-4 flex flex-col gap-2">
        <h2 className="text-white font-semibold mb-2">{t('chat.onlineFriends')}</h2>
        {friendsLoading && <p className="text-zinc-500 text-sm">{t('chat.loading')}</p>}
        {!friendsLoading && onlineFriends.length === 0 && (
          <p className="text-zinc-500 text-sm">{t('chat.noneOnline')}</p>
        )}
        <ul className="flex flex-col gap-1">
          {onlineFriends.map((f) => (
            <li key={f.id}>
              <button
                onClick={() => selectFriend(f.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
                  activeFriendId === f.id ? 'bg-zinc-700 text-white' : 'text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                {f.username}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="flex-1 flex flex-col">
        {!activeFriend ? (
          <div className="flex-1 flex items-center justify-center text-zinc-500">
            {t('chat.selectFriend')}
          </div>
        ) : (
          <>
            <header className="border-b border-zinc-800 p-4 flex items-center justify-between">
              <h3 className="text-white font-semibold">{activeFriend.username}</h3>
              <button
                onClick={() => inviteToPlay(activeFriend.id, activeFriend.username)}
                className="text-xs px-3 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-500"
              >
                {t('chat.invite')}
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[70%] px-3 py-2 rounded-lg text-sm ${
                    m.senderId === user.id ? 'self-end bg-indigo-600 text-white' : 'self-start bg-zinc-800 text-zinc-100'
                  }`}
                >
                  {m.text}
                </div>
              ))}
            </div>

            <form onSubmit={handleSend} className="border-t border-zinc-800 p-4 flex gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={t('chat.messagePlaceholder')}
                className="flex-1 h-10 rounded-lg bg-zinc-800 text-white px-3 text-sm outline-none"
              />
              <button type="submit" className="h-10 px-4 rounded-lg bg-white text-black text-sm font-medium">
                {t('chat.send')}
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}