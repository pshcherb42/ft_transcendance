'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { useFriends } from '@/hooks/useFriends';
import { useChat } from '@/hooks/useChat';
import { useGameInvite } from '@/hooks/useGameInvite';
import { useChatUnread } from '@/context/ChatUnreadContext';
import UserAvatar from '@/components/UserAvatar';

export default function ChatPage() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const router = useRouter();

  const { friends, loading: friendsLoading } = useFriends();

  const { conversations, loadHistory, sendMessage } = useChat(user?.id);

  const { inviteToPlay } = useGameInvite();
  const { unread, setActiveConversation } = useChatUnread();

  const [activeFriendId, setActiveFriendId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    setActiveConversation(activeFriendId);
    return () => setActiveConversation(null);
  }, [activeFriendId, setActiveConversation]);

  /*
   * Automatically open the first chat after the friends list loads.
   */

  if (loading || !user) {
    return (
      <main className='flex min-h-screen items-center justify-center bg-background'>
        <p className='text-sm text-muted-foreground'>{t('home.loading')}</p>
      </main>
    );
  }

  const activeFriend = friends.find((friend) => friend.id === activeFriendId);

  const messages = activeFriendId ? (conversations[activeFriendId] ?? []) : [];

  const selectFriend = (friendId: string) => {
    setActiveFriendId(friendId);
    setMobileChatOpen(true);

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

  return (
    <div className='relative flex min-h-[calc(100dvh-48px)] flex-col bg-background'>
      <main className='relative z-10 flex flex-1 flex-col'>
        {/* Top navigation */}
        <header
          className='
          flex
          items-center
          justify-between
          gap-3
          px-4
          pt-4
          sm:px-6
          sm:pt-6
          md:px-10
          md:pt-8
          lg:px-16
        '
        >
          <button
            type='button'
            onClick={() => router.push('/')}
            className='
            h-[42px]
            min-w-0
            flex-1
            px-4
            text-[13px]
            sm:h-[46px]
            sm:min-w-[190px]
            sm:flex-none
            sm:px-8
            sm:text-[14px]
            rounded-full
            border
            border-border
            text-[14px]
            font-medium
            uppercase
            text-muted-foreground
            transition-colors
            hover:bg-border/20
          '
          >
            {t('game.button.backToMenu')}
          </button>

          <button
            type='button'
            onClick={() => router.push('/profile')}
            className='
            h-[42px]
            min-w-0
            flex-1
            rounded-full
            bg-brand-green
            px-4
            text-[13px]
            font-medium
            uppercase
            text-white
            transition-colors
            hover:bg-brand-green-dark
            sm:h-[46px]
            sm:min-w-[190px]
            sm:flex-none
            sm:px-8
            sm:text-[14px]
          '
          >
            {t('home.profile')}
          </button>
        </header>

        {/* Chat area */}
        <section
          className='
          flex
          min-h-0
          flex-1
          px-4
          pb-6
          pt-6
          sm:px-6
          sm:pt-8
          md:px-10
          md:pb-8
          md:pt-10
          lg:px-16
        '
        >
          <div
            className='
            flex
            h-[calc(100dvh-170px)]
            min-h-[500px]
            w-full
            overflow-hidden
            rounded-[10px]
            bg-surface
            shadow-[-8px_8px_32px_0_var(--card-shadow)]
            sm:h-[calc(100dvh-190px)]
            md:h-[calc(100dvh-210px)]
          '
          >
            {/* Left column */}
            <aside
              className={`
              w-full
              flex-col
              md:flex
              md:w-[310px]
              md:shrink-0
              md:border-r
              md:border-border
              ${mobileChatOpen ? 'hidden' : 'flex'}
            `}
            >
              <div className='flex min-h-[90px] items-center border-b border-border px-7'>
                <h1
                  className='
                  text-[42px]
                  font-display
                  uppercase
                  leading-none
                  text-brand-red
                '
                >
                  {t('chat.title')}
                </h1>
              </div>

              <div className='flex-1 overflow-y-auto'>
                {friendsLoading && (
                  <p className='px-9 py-5 text-sm text-muted-foreground'>
                    {t('chat.loading')}
                  </p>
                )}

                {!friendsLoading && friends.length === 0 && (
                  <p className='px-9 py-5 text-sm text-muted-foreground'>
                    {t('chat.noFriends')}
                  </p>
                )}

                <ul>
                  {friends.map((friend) => {
                    const isActive = activeFriendId === friend.id;

                    return (
                      <li key={friend.id}>
                        <button
                          type='button'
                          onClick={() => selectFriend(friend.id)}
                          className={`
                          flex
                          w-full
                          items-center
                          gap-4
                          border-b
                          border-surface
                          px-7
                          py-4
                          text-left
                          transition-colors
                          ${isActive ? 'bg-border/20' : 'hover:bg-border/20'}
                        `}
                        >
                          <div className='h-[52px] w-[52px] shrink-0'>
                            <UserAvatar
                              username={friend.username}
                              avatarPath={friend.avatar}
                            />
                          </div>

                          <div className='min-w-0 flex-1'>
                            <p
                              className='
                              truncate
                              text-[18px]
                              font-semibold
                              text-muted-foreground
                            '
                            >
                              {friend.username}
                            </p>

                            <div className='mt-1 flex items-center gap-2'>
                              <span
                                className={`
                                h-[10px]
                                w-[10px]
                                rounded-full
                                ${
                                  friend.online
                                    ? 'bg-status-online'
                                    : 'bg-muted'
                                }
                              `}
                              />

                              <span
                                className='
                                text-xs
                                font-medium
                                uppercase
                                text-muted-foreground
                              '
                              >
                                {friend.online
                                  ? t('chat.online')
                                  : t('chat.offline')}
                              </span>
                            </div>
                          </div>
                          {!isActive && unread[friend.id] > 0 && (
                            <span
                              className='ml-auto shrink-0 text-base font-bold text-brand-red'
                              aria-label={t('chat.newMessage')}
                            >
                              📩
                              {unread[friend.id] > 1
                                ? ` ${unread[friend.id]}`
                                : ''}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </aside>

            {/* Right column */}
            <section
              className={`
              min-w-0
              flex-1
              flex-col
              md:flex
              min-h-0
              overflow-hidden
              ${mobileChatOpen ? 'flex' : 'hidden'}
            `}
            >
              {!activeFriend ? (
                <div
                  className='
                  flex
                  flex-1
                  items-center
                  justify-center
                  px-8
                  text-sm
                  text-muted-foreground
                '
                >
                  {t('chat.selectFriend')}
                </div>
              ) : (
                <>
                  {/* Active chat header */}
                  <header
                    className='
                    flex
                    flex-col
                    gap-3
                    border-b
                    border-border
                    px-4
                    py-4
                    sm:px-6
                    min-[510px]:min-h-[90px]
                    min-[510px]:flex-row
                    min-[6510px]:items-center
                    min-[510px]:justify-between
                    min-[510px]:gap-4
                    min-[510px]:px-8
                    min-[510px]:py-4
                    '
                  >
                    <div className='flex w-full min-w-0 items-center gap-3 md:w-auto'>
                      <button
                        type='button'
                        onClick={() => setMobileChatOpen(false)}
                        aria-label={t('chat.backToFriends')}
                        className='
                      flex
                      h-10
                      w-10
                      shrink-0
                      items-center
                      justify-center
                      rounded-full
                      border
                      border-border
                      text-muted-foreground
                      transition-colors
                      hover:bg-border/20
                      md:hidden
                    '
                      >
                        <svg
                          viewBox='0 0 24 24'
                          fill='none'
                          aria-hidden='true'
                          className='h-5 w-5'
                        >
                          <path
                            d='M15 18l-6-6 6-6'
                            stroke='currentColor'
                            strokeWidth='1.8'
                            strokeLinecap='round'
                            strokeLinejoin='round'
                          />
                        </svg>
                      </button>
                      <div className='h-[44px] w-[44px] shrink-0 sm:h-[52px] sm:w-[52px]'>
                        <UserAvatar
                          username={activeFriend.username}
                          avatarPath={activeFriend.avatar}
                        />
                      </div>

                      <div>
                        <h2 className='text-xl font-semibold text-muted-foreground'>
                          {activeFriend.username}
                        </h2>

                        <div className='mt-1 flex items-center gap-2'>
                          <span
                            className={`
                            h-[10px]
                            w-[10px]
                            rounded-full
                            ${
                              activeFriend.online
                                ? 'bg-status-online'
                                : 'bg-muted'
                            }
                          `}
                          />

                          <span
                            className='
                            text-xs
                            font-medium
                            uppercase
                            text-muted-foreground
                          '
                          >
                            {activeFriend.online
                              ? t('chat.online')
                              : t('chat.offline')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type='button'
                      onClick={() =>
                        inviteToPlay(activeFriend.id, activeFriend.username)
                      }
                      className='
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
                      hover:bg-brand-red-dark
                    '
                    >
                      {t('chat.invite')}
                    </button>
                  </header>

                  {/* Messages */}
                  <div
                    className='
                    flex
                    min-h-0
                    flex-1
                    flex-col
                    gap-3
                    overflow-y-auto
                    px-4
                    py-5
                    sm:px-6
                    sm:py-6
                    md:px-8
                    md:py-8
                  '
                  >
                    {messages.length === 0 && (
                      <div
                        className='
                        flex
                        flex-1
                        items-center
                        justify-center
                        text-sm
                        text-muted-foreground
                      '
                      >
                        {t('chat.noMessages')}
                      </div>
                    )}

                    {messages.map((message) => {
                      const isOwnMessage = message.senderId === user.id;

                      return (
                        <div
                          key={message.id}
                          className={`
                          flex
                          max-w-[75%]
                          items-end
                          gap-3
                          ${isOwnMessage ? 'self-end' : 'self-start'}
                        `}
                        >
                          <div
                            className={`
                            rounded-[22px]
                            px-5
                            py-3
                            text-sm
                            leading-5
                            text-muted-foreground
                            ${
                              isOwnMessage
                                ? 'rounded-br-md bg-border'
                                : 'rounded-bl-md bg-surface'
                            }
                          `}
                          >
                            {message.text}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Message input */}
                  <form
                    onSubmit={handleSend}
                    className='
                    flex
                    items-center
                    gap-2
                    border-t
                    border-border
                    px-3
                    py-3
                    sm:gap-3
                    sm:px-4
                    sm:py-4
                    md:gap-5
                    md:px-8
                  '
                  >
                    <input
                      id='chat-message'
                      name='message'
                      type='text'
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      placeholder={t('chat.messagePlaceholder')}
                      className='
                      h-[46px]
                      min-w-0
                      flex-1
                      rounded-full
                      border
                      border-border
                      bg-surface
                      px-5
                      text-sm
                      text-muted-foreground
                      outline-none
                      transition-colors
                      placeholder:text-muted-foreground
                      hover:border-brand-green
                      focus:border-brand-green
                    '
                    />

                    <button
                      type='submit'
                      disabled={!draft.trim()}
                      className='
                      h-[42px]
                      min-w-[82px]
                      rounded-full
                      bg-brand-red
                      px-6
                      text-xs
                      font-medium
                      uppercase
                      text-white
                      transition-colors
                      hover:bg-brand-red-dark
                      disabled:cursor-not-allowed
                      disabled:opacity-40
                    '
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
