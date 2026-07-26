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

  const {
    friends,
    loading: friendsLoading,
  } = useFriends();

  const {
    conversations,
    loadHistory,
    sendMessage,
  } = useChat(user?.id);

  const { inviteToPlay } = useGameInvite();

  const [activeFriendId, setActiveFriendId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  /*
   * Автоматически открываем первый чат после загрузки друзей.
   */
  useEffect(() => {
    if (!friendsLoading && friends.length > 0 && !activeFriendId) {
      const firstFriendId = friends[0].id;

      setActiveFriendId(firstFriendId);
      loadHistory(firstFriendId);
    }
  }, [
    friends,
    friendsLoading,
    activeFriendId,
    loadHistory,
  ]);

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F4F2EE]">
        <p className="text-sm text-[#615050]">
          {t('home.loading')}
        </p>
      </main>
    );
  }

  const activeFriend = friends.find(
    (friend) => friend.id === activeFriendId,
  );

  const messages = activeFriendId
    ? conversations[activeFriendId] ?? []
    : [];

  const selectFriend = (friendId: string) => {
    setActiveFriendId(friendId);

    if (!conversations[friendId]) {
      loadHistory(friendId);
    }
  };

  const handleSend = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const message = draft.trim();

    if (!activeFriendId || !message) {
      return;
    }

    sendMessage(activeFriendId, message);
    setDraft('');
  };

  const getInitial = (username: string) =>
    username.charAt(0).toUpperCase();

  return (
  <div className="relative flex min-h-[calc(100dvh-48px)] flex-col overflow-hidden bg-background">
    <main className="relative z-10 flex flex-1 flex-col">
      {/* Верхняя навигация */}
      <header className="flex flex-wrap items-center justify-between gap-4 px-8 pt-8 md:px-16">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="
            h-[46px]
            min-w-[190px]
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
          "
        >
          {t('game.button.backToMenu')}
        </button>

        <button
          type="button"
          onClick={() => router.push('/profile')}
          className="
            ml-auto
            h-[46px]
            min-w-[190px]
            rounded-full
            bg-brand-green
            px-8
            text-[14px]
            font-medium
            uppercase
            text-white
            transition-colors
            hover:bg-[#808979]
          "
        >
          {t('home.profile')}
        </button>
      </header>

      {/* Область чата */}
      <section className="flex min-h-0 flex-1 px-8 pb-8 pt-10 md:px-16">
        <div
          className="
            flex
            min-h-0
            flex-1
            overflow-hidden
            rounded-[10px]
            bg-white
            shadow-[-8px_8px_32px_0_rgba(193,168,163,0.25)]
          "
        >
          {/* Левая колонка */}
          <aside
            className="
              flex
              w-[310px]
              shrink-0
              flex-col
              border-r
              border-[#D9D5D1]
            "
          >
            <div className="px-9 pb-8 pt-7">
              <h1
                className="
                  text-[42px]
                  font-display
                  uppercase
                  leading-none
                  text-brand-red
                "
              >
                {t('chat.title')}
              </h1>
            </div>

            <div className="flex-1 overflow-y-auto">
              {friendsLoading && (
                <p className="px-9 py-5 text-sm text-[#8E8780]">
                  {t('chat.loading')}
                </p>
              )}

              {!friendsLoading && friends.length === 0 && (
                <p className="px-9 py-5 text-sm text-[#8E8780]">
                  {t('chat.noFriends')}
                </p>
              )}

              <ul>
                {friends.map((friend) => {
                  const isActive = activeFriendId === friend.id;

                  return (
                    <li key={friend.id}>
                      <button
                        type="button"
                        onClick={() => selectFriend(friend.id)}
                        className={`
                          flex
                          w-full
                          items-center
                          gap-4
                          border-b
                          border-[#F1EFEC]
                          px-7
                          py-4
                          text-left
                          transition-colors
                          ${
                            isActive
                              ? 'bg-[#F7F5F1]'
                              : 'bg-white hover:bg-[#FAF9F7]'
                          }
                        `}
                      >
                        <div
                          className="
                            flex
                            h-[52px]
                            w-[52px]
                            shrink-0
                            items-center
                            justify-center
                            rounded-full
                            bg-[#DEDAD4]
                            text-lg
                            font-bold
                            text-white
                          "
                        >
                          {getInitial(friend.username)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p
                            className="
                              truncate
                              text-[18px]
                              font-semibold
                              text-[#615050]
                            "
                          >
                            {friend.username}
                          </p>

                          <div className="mt-1 flex items-center gap-2">
                            <span
                              className={`
                                h-[10px]
                                w-[10px]
                                rounded-full
                                ${
                                  friend.online
                                    ? 'bg-[#8EBE78]'
                                    : 'bg-[#CFCAC4]'
                                }
                              `}
                            />

                            <span
                              className="
                                text-xs
                                font-medium
                                uppercase
                                text-[#615050]
                              "
                            >
                              {friend.online
                                ? t('chat.online')
                                : t('chat.offline')}
                            </span>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>

          {/* Правая колонка */}
          <section className="flex min-w-0 flex-1 flex-col">
            {!activeFriend ? (
              <div
                className="
                  flex
                  flex-1
                  items-center
                  justify-center
                  px-8
                  text-sm
                  text-[#8E8780]
                "
              >
                {t('chat.selectFriend')}
              </div>
            ) : (
              <>
                {/* Заголовок активного чата */}
                <header
                  className="
                    flex
                    min-h-[90px]
                    items-center
                    justify-between
                    border-b
                    border-[#D9D5D1]
                    px-8
                  "
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="
                        flex
                        h-[52px]
                        w-[52px]
                        shrink-0
                        items-center
                        justify-center
                        rounded-full
                        bg-[#DEDAD4]
                        text-lg
                        font-bold
                        text-white
                      "
                    >
                      {getInitial(activeFriend.username)}
                    </div>

                    <div>
                      <h2 className="text-xl font-semibold text-[#615050]">
                        {activeFriend.username}
                      </h2>

                      <div className="mt-1 flex items-center gap-2">
                        <span
                          className={`
                            h-[10px]
                            w-[10px]
                            rounded-full
                            ${
                              activeFriend.online
                                ? 'bg-[#8EBE78]'
                                : 'bg-[#CFCAC4]'
                            }
                          `}
                        />

                        <span
                          className="
                            text-xs
                            font-medium
                            uppercase
                            text-[#615050]
                          "
                        >
                          {activeFriend.online
                            ? t('chat.online')
                            : t('chat.offline')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      inviteToPlay(
                        activeFriend.id,
                        activeFriend.username,
                      )
                    }
                    className="
                      h-[46px]
                      min-w-[190px]
                      rounded-full
                      bg-brand-red
                      px-8
                      text-[14px]
                      font-medium
                      uppercase
                      text-white
                      transition-colors
                      hover:bg-[#D9361F]
                    "
                  >
                    {t('chat.invite')}
                  </button>
                </header>

                {/* Сообщения */}
                <div
                  className="
                    flex
                    min-h-0
                    flex-1
                    flex-col
                    gap-3
                    overflow-y-auto
                    px-8
                    py-8
                  "
                >
                  {messages.length === 0 && (
                    <div
                      className="
                        flex
                        flex-1
                        items-center
                        justify-center
                        text-sm
                        text-[#AAA39C]
                      "
                    >
                      {t('chat.noMessages')}
                    </div>
                  )}

                  {messages.map((message) => {
                    const isOwnMessage =
                      message.senderId === user.id;

                    return (
                      <div
                        key={message.id}
                        className={`
                          flex
                          max-w-[75%]
                          items-end
                          gap-3
                          ${
                            isOwnMessage
                              ? 'self-end'
                              : 'self-start'
                          }
                        `}
                      >
                        <div
                          className={`
                            rounded-[22px]
                            px-5
                            py-3
                            text-sm
                            leading-5
                            text-[#615050]
                            ${
                              isOwnMessage
                                ? 'rounded-br-md bg-[#D8D4CE]'
                                : 'rounded-bl-md bg-[#F0EEEA]'
                            }
                          `}
                        >
                          {message.text}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Поле отправки */}
                <form
                  onSubmit={handleSend}
                  className="
                    flex
                    items-center
                    gap-5
                    border-t
                    border-[#D9D5D1]
                    px-8
                    py-4
                  "
                >
                  <input
                    type="text"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder={t('chat.messagePlaceholder')}
                    className="
                      h-[46px]
                      min-w-0
                      flex-1
                      rounded-full
                      border
                      border-[#D9D5D1]
                      bg-white
                      px-5
                      text-sm
                      text-[#615050]
                      outline-none
                      transition-colors
                      placeholder:text-zinc-400
                      hover:border-brand-green
                      focus:border-brand-green
                    "
                  />

                  <button
                    type="submit"
                    disabled={!draft.trim()}
                    className="
                      h-[42px]
                      min-w-[82px]
                      rounded-full
                      bg-[#EE4424]
                      px-6
                      text-xs
                      font-medium
                      uppercase
                      text-white
                      transition-colors
                      hover:bg-[#D6381C]
                      disabled:cursor-not-allowed
                      disabled:opacity-40
                    "
                  >
                    {t('chat.send')}
                  </button>
                </form>
              </>
            )}
          </section>
        </div>
        </section>
      </main>
    </div>
  );
}