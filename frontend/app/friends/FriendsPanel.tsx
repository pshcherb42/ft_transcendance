'use client';

import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useFriends } from '@/hooks/useFriends';
import { useGameInvite } from '@/hooks/useGameInvite';
import UserAvatar from '@/components/UserAvatar';

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
        <p className="text-sm text-muted-foreground">
          {t('friends.loading')}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[280px] items-center justify-center">
        <p className="text-sm text-brand-red">
          {t(error)}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Add a friend */}
      <form
        onSubmit={handleSend}
        className="
          flex
          flex-col
          gap-3
          border-b
          border-surface
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
            w-full
            shrink-0
            sm:min-w-0
            sm:flex-1
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
          "
        />

        <button
          type="submit"
          disabled={
            sending || !username.trim()
          }
          className="
            h-[42px]
            w-full
            rounded-full
            bg-brand-green
            px-5
            text-[13px]
            font-medium
            uppercase
            text-white
            transition-colors
            hover:bg-brand-green-dark
            disabled:cursor-not-allowed
            disabled:opacity-50
            sm:h-[46px]
            sm:w-auto
            sm:min-w-[160px]
            sm:px-7
            sm:text-[14px]
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
        <p className="mt-3 text-sm text-brand-red">
          {sendError}
        </p>
      )}

      <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-0">
        {/* Friends list */}
        <section className="lg:border-r lg:border-surface lg:pr-10">
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
                    border-surface
                    pb-5
                    min-[550px]:grid-cols-[minmax(0,1fr)_110px_110px]
                  "
                >
                  <div className="flex min-w-0 items-center gap-3">
                  <UserAvatar
                    username={friend.username}
                    avatarPath={friend.avatar}
                  />

                    <div className="min-w-0">
                      <p className="truncate text-[16px] font-semibold text-muted-foreground">
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
                                ? 'bg-status-online'
                                : 'bg-muted'
                            }
                          `}
                        />

                        <span className="text-xs text-muted-foreground">
                          {friend.online
                            ? t('profile.online')
                            : t('profile.offline')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div
                    className="
                      grid
                      grid-cols-2
                      gap-2
                      min-[550px]:contents
                    "
                  >
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
                        h-[38px]
                        rounded-full
                        bg-brand-green
                        px-4
                        text-[12px]
                        font-medium
                        uppercase
                        text-white
                        transition-colors
                        hover:bg-brand-green-dark
                        disabled:cursor-not-allowed
                        disabled:opacity-40
                        min-[550px]:h-[34px]
                      "
                    >
                      {t('friends.play')}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        removeFriend(friend.friendshipId)
                      }
                      className="
                        h-[38px]
                        rounded-full
                        border
                        border-border
                        px-4
                        text-[12px]
                        font-medium
                        uppercase
                        text-muted-foreground
                        transition-colors
                        hover:bg-border/20
                        min-[550px]:h-[34px]
                      "
                    >
                      {t('friends.remove')}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyBlock
              text={t('friends.noFriends', {
                defaultValue:
                  t('friends.noFriendsYet'),
              })}
            />
          )}
        </section>

        {/* Requests */}
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
                    border-surface
                    pb-5
                    min-[550px]:grid-cols-[minmax(0,1fr)_110px_110px]
                  "
                >
                  <div className="flex min-w-0 items-center gap-3">
                  <UserAvatar
                    username={request.sender.username}
                    avatarPath={request.sender.avatar}
                  />

                    <p className="truncate text-[16px] font-semibold text-muted-foreground">
                      {request.sender.username}
                    </p>
                  </div>

                  <div
                  className="
                    grid
                    grid-cols-2
                    gap-2
                    min-[550px]:contents
                  "
                >
                  <button
                    type="button"
                    onClick={() =>
                      respondToRequest(
                        request.id,
                        'accept',
                      )
                    }
                    className="
                      h-[38px]
                      rounded-full
                      bg-brand-green
                      px-4
                      text-[12px]
                      font-medium
                      uppercase
                      text-white
                      transition-colors
                      hover:bg-brand-green-dark
                      min-[550px]:h-[34px]
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
                      h-[38px]
                      rounded-full
                      border
                      border-border
                      px-4
                      text-[12px]
                      font-medium
                      uppercase
                      text-muted-foreground
                      transition-colors
                      hover:bg-border/20
                      min-[550px]:h-[34px]
                    "
                  >
                    {t('friends.decline')}
                  </button>
                </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyBlock
              text={t(
                'friends.noIncomingRequests',
                {
                  defaultValue:
                  t('friends.noIncomingRequests'),
                },
              )}
            />
          )}

          {outgoing.length > 0 && (
            <div className="mt-10">
              <h3 className="mb-5 text-sm font-bold uppercase tracking-wide text-muted-foreground">
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
                      border-surface
                      bg-background
                      px-4
                      py-3
                    "
                  >
                    <div className="flex min-w-0 items-center gap-3">
                    <UserAvatar
                      username={request.receiver.username}
                      avatarPath={request.receiver.avatar}
                    />

                      <span className="truncate text-sm font-medium text-muted-foreground">
                        {
                          request.receiver
                            .username
                        }
                      </span>
                    </div>

                    <span className="shrink-0 text-xs uppercase text-muted-foreground">
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
      <p className="text-center text-sm text-muted-foreground">
        {text}
      </p>
    </div>
  );
}