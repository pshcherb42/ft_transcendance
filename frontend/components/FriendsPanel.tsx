'use client';

import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useFriends } from '@/hooks/useFriends';
import { useGameInvite } from '@/hooks/useGameInvite';

export default function FriendsPanel() {
  const { t } = useTranslation();

  const {
    friends,
    incoming,
    outgoing,
    loading,
    error,
    sendRequest,
    respondToRequest,
    removeFriend,
  } = useFriends();

  const { inviteToPlay } = useGameInvite();

  const [username, setUsername] = useState('');
  const [sendError, setSendError] =
    useState<string | null>(null);

  const [sending, setSending] = useState(false);

  async function handleSend(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const trimmedUsername = username.trim();

    if (!trimmedUsername) {
      return;
    }

    setSendError(null);
    setSending(true);

    try {
      await sendRequest(trimmedUsername);
      setUsername('');
    } catch (err) {
      setSendError(
        err instanceof Error
          ? t(err.message)
          : t('friends.sendFailed'),
      );
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[280px] items-center justify-center">
        <p className="text-sm text-zinc-400">
          {t('friends.loading')}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[280px] items-center justify-center">
        <p className="text-sm text-red-500">
          {t(error)}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Добавление друга */}
      <form
        onSubmit={handleSend}
        className="
          flex
          flex-col
          gap-3
          border-b
          border-[#EEE9E6]
          pb-8
          sm:flex-row
        "
      >
        <input
          value={username}
          onChange={(event) =>
            setUsername(event.target.value)
          }
          placeholder={t(
            'friends.usernamePlaceholder',
          )}
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
            focus:border-brand-green
          "
        />

        <button
          type="submit"
          disabled={
            sending || !username.trim()
          }
          className="
            h-[46px]
            min-w-[160px]
            rounded-full
            bg-brand-green
            px-7
            text-[14px]
            font-medium
            uppercase
            text-white
            transition-colors
            hover:bg-[#808979]
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
        >
          {sending
            ? t('friends.sending', {
                defaultValue: 'Sending',
              })
            : t('friends.add')}
        </button>
      </form>

      {sendError && (
        <p className="mt-3 text-sm text-red-500">
          {sendError}
        </p>
      )}

      <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-0">
        {/* Список друзей */}
        <section className="lg:border-r lg:border-[#EEE9E6] lg:pr-10">
          <h2 className="mb-5 font-display text-[28px] uppercase leading-none text-brand-red">
            {t('friends.friendsCount', {
              count: friends.length,
            })}
          </h2>

          {friends.length > 0 ? (
            <ul className="flex flex-col gap-5">
              {friends.map((friend) => (
                <li
                  key={friend.friendshipId}
                  className="
                    grid
                    items-center
                    gap-3
                    border-b
                    border-[#EEE9E6]
                    pb-5
                    sm:grid-cols-[minmax(0,1fr)_110px_110px]
                  "
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <UserAvatar
                      username={friend.username}
                    />

                    <div className="min-w-0">
                      <p className="truncate text-[16px] font-semibold text-[#615050]">
                        {friend.username}
                      </p>

                      <div className="mt-1 flex items-center gap-2">
                        <span
                          className={`
                            h-2
                            w-2
                            rounded-full
                            ${
                              friend.online
                                ? 'bg-[#98C47C]'
                                : 'bg-[#CFC5C1]'
                            }
                          `}
                        />

                        <span className="text-xs text-zinc-400">
                          {friend.online
                            ? t('friends.online', {
                                defaultValue:
                                  'Online',
                              })
                            : t('friends.offline', {
                                defaultValue:
                                  'Offline',
                              })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!friend.online}
                    onClick={() =>
                      inviteToPlay(
                        friend.id,
                        friend.username,
                      )
                    }
                    className="
                      h-[34px]
                      rounded-full
                      bg-brand-green
                      px-4
                      text-[12px]
                      font-medium
                      uppercase
                      text-white
                      transition-colors
                      hover:bg-[#808979]
                      disabled:cursor-not-allowed
                      disabled:opacity-40
                    "
                  >
                    {t('friends.play')}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      removeFriend(
                        friend.friendshipId,
                      )
                    }
                    className="
                      h-[34px]
                      rounded-full
                      border
                      border-[#D9D5D1]
                      px-4
                      text-[12px]
                      font-medium
                      uppercase
                      text-[#615050]
                      transition-colors
                      hover:bg-[#D9D9D9]/20
                    "
                  >
                    {t('friends.remove')}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyBlock
              text={t('friends.noFriends', {
                defaultValue:
                  'No friends yet',
              })}
            />
          )}
        </section>

        {/* Запросы */}
        <section className="lg:pl-10">
          <h2 className="mb-5 font-display text-[28px] uppercase leading-none text-brand-red">
            {t('friends.incomingRequests')}
          </h2>

          {incoming.length > 0 ? (
            <ul className="flex flex-col gap-5">
              {incoming.map((request) => (
                <li
                  key={request.id}
                  className="
                    grid
                    items-center
                    gap-3
                    border-b
                    border-[#EEE9E6]
                    pb-5
                    sm:grid-cols-[minmax(0,1fr)_110px_110px]
                  "
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <UserAvatar
                      username={
                        request.sender.username
                      }
                    />

                    <p className="truncate text-[16px] font-semibold text-[#615050]">
                      {request.sender.username}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      respondToRequest(
                        request.id,
                        'accept',
                      )
                    }
                    className="
                      h-[34px]
                      rounded-full
                      bg-brand-green
                      px-4
                      text-[12px]
                      font-medium
                      uppercase
                      text-white
                      transition-colors
                      hover:bg-[#808979]
                    "
                  >
                    {t('friends.accept')}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      respondToRequest(
                        request.id,
                        'decline',
                      )
                    }
                    className="
                      h-[34px]
                      rounded-full
                      border
                      border-[#D9D5D1]
                      px-4
                      text-[12px]
                      font-medium
                      uppercase
                      text-[#615050]
                      transition-colors
                      hover:bg-[#D9D9D9]/20
                    "
                  >
                    {t('friends.decline')}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyBlock
              text={t(
                'friends.noIncomingRequests',
                {
                  defaultValue:
                    'No incoming requests',
                },
              )}
            />
          )}

          {outgoing.length > 0 && (
            <div className="mt-10">
              <h3 className="mb-5 text-sm font-bold uppercase tracking-wide text-[#615050]">
                {t(
                  'friends.outgoingRequests',
                )}
              </h3>

              <ul className="flex flex-col gap-3">
                {outgoing.map((request) => (
                  <li
                    key={request.id}
                    className="
                      flex
                      items-center
                      justify-between
                      gap-3
                      rounded-[10px]
                      border
                      border-[#EEE9E6]
                      bg-background
                      px-4
                      py-3
                    "
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <UserAvatar
                        username={
                          request.receiver
                            .username
                        }
                      />

                      <span className="truncate text-sm font-medium text-[#615050]">
                        {
                          request.receiver
                            .username
                        }
                      </span>
                    </div>

                    <span className="shrink-0 text-xs uppercase text-zinc-400">
                      {t('friends.pending')}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function UserAvatar({
  username,
}: {
  username: string;
}) {
  return (
    <div
      className="
        flex
        h-10
        w-10
        shrink-0
        items-center
        justify-center
        rounded-full
        bg-[#D9D5D1]
        text-sm
        font-bold
        uppercase
        text-white
      "
    >
      {username.charAt(0).toUpperCase()}
    </div>
  );
}

function EmptyBlock({
  text,
}: {
  text: string;
}) {
  return (
    <div
      className="
        flex
        min-h-[150px]
        items-center
        justify-center
        px-5
      "
    >
      <p className="text-center text-sm text-zinc-400">
        {text}
      </p>
    </div>
  );
}