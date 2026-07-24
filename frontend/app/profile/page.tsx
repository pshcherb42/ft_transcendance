'use client';

import {
  ChangeEvent,
  FormEvent,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import imageCompression from 'browser-image-compression';
import { toast } from 'sonner';

import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/app/lib/api';
import { updateProfileSchema } from '@/validation/auth.schema';

type ProfileTab = 'friends' | 'statistics' | 'leaderboard';

type Friend = {
  id: number;
  username: string;
  avatarPath: string | null;
};

type FriendRequest = {
  id: number;
  username: string;
  avatarPath: string | null;
};

const TEMP_FRIENDS: Friend[] = [
  {
    id: 1,
    username: 'Poli',
    avatarPath: null,
  },
  {
    id: 2,
    username: 'Ernestissimo',
    avatarPath: null,
  },
  {
    id: 3,
    username: 'Davidello',
    avatarPath: null,
  },
];

const TEMP_REQUESTS: FriendRequest[] = [
  {
    id: 1,
    username: 'Random guy',
    avatarPath: null,
  },
  {
    id: 2,
    username: 'Cool girl',
    avatarPath: null,
  },
];

export default function ProfilePage() {
  const { t } = useTranslation();
  const { user, loading, logout, refetchUser } = useAuth();
  const router = useRouter();

  const fileRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] =
    useState<ProfileTab>('friends');

  const [editModalOpen, setEditModalOpen] =
    useState(false);

  const [username, setUsername] = useState('');
  const [currentPassword, setCurrentPassword] =
    useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] =
    useState('');

  const [saveStatus, setSaveStatus] =
    useState<
      'idle' | 'saving' | 'saved' | 'error'
    >('idle');

  const [saveError, setSaveError] = useState('');

  const [avatarStatus, setAvatarStatus] =
    useState<
      'idle' | 'uploading' | 'done' | 'error'
    >('idle');

  const [avatarPreview, setAvatarPreview] =
    useState<string | null>(null);

  const [fieldErrors, setFieldErrors] =
    useState<Record<string, string>>({});

  const [friends, setFriends] =
    useState<Friend[]>(TEMP_FRIENDS);

  const [requests, setRequests] =
    useState<FriendRequest[]>(TEMP_REQUESTS);

  /*
   * Временные значения.
   * Потом их нужно заменить данными с backend.
   */
  const games = 0;
  const wins = 0;
  const losses = 0;

  const winPercentage =
    games === 0
      ? 0
      : Math.round((wins / games) * 100);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user) {
      setUsername(user.username);
    }
  }, [user]);

  useEffect(() => {
    if (!editModalOpen) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeEditModal();
      }
    }

    document.body.style.overflow = 'hidden';

    window.addEventListener(
      'keydown',
      handleEscape,
    );

    return () => {
      document.body.style.overflow = '';

      window.removeEventListener(
        'keydown',
        handleEscape,
      );
    };
  }, [editModalOpen]);

  function openEditModal() {
    if (user) {
      setUsername(user.username);
    }

    setSaveError('');
    setFieldErrors({});
    setSaveStatus('idle');
    setEditModalOpen(true);
  }

  function closeEditModal() {
    if (user) {
      setUsername(user.username);
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setSaveError('');
    setFieldErrors({});
    setSaveStatus('idle');
    setEditModalOpen(false);
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();

    setSaveError('');
    setFieldErrors({});

    const result =
      updateProfileSchema.safeParse({
        username,
        currentPassword,
        newPassword,
        confirmPassword,
      });

    if (!result.success) {
      const errors: Record<string, string> = {};

      for (const issue of result.error.issues) {
        errors[issue.path[0] as string] =
          issue.message;
      }

      setFieldErrors(errors);

      toast.error(
        t('profile.fixFieldErrors'),
      );

      return;
    }

    setSaveStatus('saving');

    try {
      const body: Record<string, string> = {
        username,
      };

      if (newPassword && currentPassword) {
        body.currentPassword =
          currentPassword;

        body.newPassword = newPassword;
      }

      const response = await apiFetch(
        '/users/me',
        {
          method: 'PUT',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify(body),
        },
      );

      if (!response.ok) {
        const data = await response
          .json()
          .catch(() => ({}));

        const errorMessage =
          data?.message ??
          t('profile.saveFailed');

        setSaveError(errorMessage);
        setSaveStatus('error');

        toast.error(errorMessage);

        return;
      }

      await refetchUser();

      setSaveStatus('saved');

      toast.success(
        t('profile.profileUpdated'),
      );

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      window.setTimeout(() => {
        setSaveStatus('idle');
        setEditModalOpen(false);
      }, 700);
    } catch {
      const errorMessage = t(
        'profile.saveFailed',
      );

      setSaveError(errorMessage);
      setSaveStatus('error');

      toast.error(errorMessage);
    }
  }

  async function handleAvatarChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setAvatarStatus('uploading');

    try {
      const compressed =
        await imageCompression(file, {
          maxSizeMB: 0.8,
          maxWidthOrHeight: 256,
          useWebWorker: true,
        });

      const base64 =
        await new Promise<string>(
          (resolve, reject) => {
            const reader =
              new FileReader();

            reader.onloadend = () => {
              resolve(
                reader.result as string,
              );
            };

            reader.onerror = reject;

            reader.readAsDataURL(
              compressed,
            );
          },
        );

      setAvatarPreview(base64);

      const response = await apiFetch(
        '/users/me/avatar',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            avatar: base64,
          }),
        },
      );

      if (!response.ok) {
        setAvatarStatus('error');

        toast.error(
          t(
            'profile.avatarUploadFailed',
          ),
        );

        return;
      }

      await refetchUser();

      setAvatarStatus('done');

      toast.success(
        t('profile.avatarUpdated'),
      );

      window.setTimeout(() => {
        setAvatarStatus('idle');
      }, 2000);
    } catch {
      setAvatarStatus('error');

      toast.error(
        t('profile.avatarUploadFailed'),
      );
    } finally {
      event.target.value = '';
    }
  }

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  function handleDeleteFriend(
    friendId: number,
  ) {
    setFriends((currentFriends) =>
      currentFriends.filter(
        (friend) =>
          friend.id !== friendId,
      ),
    );
  }

  function handleAcceptRequest(
    request: FriendRequest,
  ) {
    setRequests((currentRequests) =>
      currentRequests.filter(
        (currentRequest) =>
          currentRequest.id !== request.id,
      ),
    );

    setFriends((currentFriends) => [
      ...currentFriends,
      {
        id: request.id + 1000,
        username: request.username,
        avatarPath:
          request.avatarPath,
      },
    ]);
  }

  function handleRejectRequest(
    requestId: number,
  ) {
    setRequests((currentRequests) =>
      currentRequests.filter(
        (request) =>
          request.id !== requestId,
      ),
    );
  }

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-zinc-400">
          {t('profile.loading')}
        </p>
      </main>
    );
  }

  const avatarSrc =
    avatarPreview ??
    user.avatarPath ??
    null;

  const isOAuthUser =
    !user.hasPassword;

  return (
    <div className="relative flex min-h-[calc(100dvh-48px)] flex-col overflow-hidden bg-background">
      <main className="relative z-10 flex flex-1 flex-col">
        {/* Верхние кнопки */}
        <header className="flex flex-wrap items-center justify-between gap-4 px-8 pt-8 md:px-16 md:pt-8">
          <button
            type="button"
            onClick={() =>
              router.push('/')
            }
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
            {t('profile.backToMenu', {
              defaultValue:
                'Back to menu',
            })}
          </button>

          <div className="ml-auto flex flex-wrap gap-4">
            <button
              type="button"
              onClick={() =>
                router.push('/chat')
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
              {t('profile.chat', {
                defaultValue: 'Chat',
              })}
            </button>

            <button
              type="button"
              onClick={openEditModal}
              className="
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
              {t(
                'profile.editProfile',
                {
                  defaultValue:
                    'Edit profile',
                },
              )}
            </button>
          </div>
        </header>

        <section className="mx-auto flex w-full max-w-[1380px] flex-1 flex-col px-8 pb-12 pt-10 md:px-16">
          {/* Верхняя информация профиля */}
          <div className="grid items-center gap-10 lg:grid-cols-[460px_1fr]">
            <div className="flex items-center gap-8">
              <button
                type="button"
                onClick={openEditModal}
                className="
                  group
                  relative
                  h-[165px]
                  w-[165px]
                  shrink-0
                  overflow-hidden
                  rounded-full
                  bg-[#D9D5D1]
                  outline-none
                  transition-shadow
                  focus:ring-2
                  focus:ring-brand-red
                  focus:ring-offset-4
                  focus:ring-offset-background
                "
              >
                {avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt={user.username}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center font-display text-[68px] uppercase text-white">
                    {user.username
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                )}

                <span
                  className="
                    absolute
                    inset-0
                    flex
                    items-center
                    justify-center
                    bg-black/40
                    px-3
                    text-center
                    text-xs
                    font-medium
                    uppercase
                    text-white
                    opacity-0
                    transition-opacity
                    group-hover:opacity-100
                  "
                >
                  {t(
                    'profile.changeAvatar',
                  )}
                </span>
              </button>

              <div className="min-w-0">
                <h1 className="break-words font-display text-[clamp(2.8rem,5vw,56px)] uppercase leading-none text-brand-red">
                  {user.username}
                </h1>

                <p className="mt-4 break-all text-[15px] text-[#615050]">
                  {user.email}
                </p>

                <div className="mt-8 flex items-center gap-3">
                  <span className="h-[13px] w-[13px] rounded-full bg-[#98C47C]" />

                  <span className="text-[14px] font-medium uppercase text-[#615050]">
                    {t('profile.online', {
                      defaultValue:
                        'Online',
                    })}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              <StatCard
                value={games}
                label={t(
                  'profile.games',
                  {
                    defaultValue:
                      'Games',
                  },
                )}
              />

              <StatCard
                value={wins}
                label={t(
                  'profile.wins',
                  {
                    defaultValue:
                      'Wins',
                  },
                )}
              />

              <StatCard
                value={losses}
                label={t(
                  'profile.losses',
                  {
                    defaultValue:
                      'Loss',
                  },
                )}
              />

              <StatCard
                value={winPercentage}
                label={t(
                  'profile.winPercentage',
                  {
                    defaultValue:
                      '% Wins',
                  },
                )}
              />
            </div>
          </div>

          {/* Вкладки */}
          <div className="mt-10 flex flex-wrap gap-3">
            <TabButton
              active={
                activeTab === 'friends'
              }
              onClick={() =>
                setActiveTab('friends')
              }
            >
              {t('profile.friends', {
                defaultValue:
                  'Friends',
              })}
            </TabButton>

            <TabButton
              active={
                activeTab ===
                'statistics'
              }
              onClick={() =>
                setActiveTab(
                  'statistics',
                )
              }
            >
              {t(
                'profile.statistics',
                {
                  defaultValue:
                    'Statistics',
                },
              )}
            </TabButton>

            <TabButton
              active={
                activeTab ===
                'leaderboard'
              }
              onClick={() =>
                setActiveTab(
                  'leaderboard',
                )
              }
            >
              {t(
                'profile.leaderboard',
                {
                  defaultValue:
                    'Leaderboard',
                },
              )}
            </TabButton>
          </div>

          {/* Основная белая карточка */}
          <div
            className="
              mt-6
              min-h-[420px]
              w-full
              rounded-[10px]
              bg-white
              px-8
              py-10
              shadow-[-8px_8px_32px_0_rgba(193,168,163,0.25)]
              md:px-12
            "
          >
            {activeTab ===
              'friends' && (
              <div className="grid gap-10 lg:grid-cols-2 lg:gap-0">
                {/* Список друзей */}
                <div className="lg:border-r lg:border-[#EEE9E6] lg:pr-10">
                  <h2 className="mb-8 font-display text-[36px] uppercase leading-none text-brand-red">
                    {t(
                      'profile.friendsList',
                      {
                        defaultValue:
                          'Friends list',
                      },
                    )}
                  </h2>

                  {friends.length > 0 ? (
                    <div className="space-y-5">
                      {friends.map(
                        (friend) => (
                          <FriendRow
                            key={
                              friend.id
                            }
                            friend={
                              friend
                            }
                            playLabel={t(
                              'profile.play',
                              {
                                defaultValue:
                                  'Play',
                              },
                            )}
                            deleteLabel={t(
                              'profile.delete',
                              {
                                defaultValue:
                                  'Delete',
                              },
                            )}
                            onPlay={() =>
                              router.push(
                                `/game?opponent=${friend.id}`,
                              )
                            }
                            onDelete={() =>
                              handleDeleteFriend(
                                friend.id,
                              )
                            }
                          />
                        ),
                      )}
                    </div>
                  ) : (
                    <EmptyState
                      text={t(
                        'profile.noFriends',
                        {
                          defaultValue:
                            'No friends yet',
                        },
                      )}
                    />
                  )}
                </div>

                {/* Запросы */}
                <div className="lg:pl-10">
                  <h2 className="mb-8 font-display text-[36px] uppercase leading-none text-brand-red">
                    {t(
                      'profile.requests',
                      {
                        defaultValue:
                          'Requests',
                      },
                    )}
                  </h2>

                  {requests.length >
                  0 ? (
                    <div className="space-y-5">
                      {requests.map(
                        (request) => (
                          <RequestRow
                            key={
                              request.id
                            }
                            request={
                              request
                            }
                            acceptLabel={t(
                              'profile.accept',
                              {
                                defaultValue:
                                  'Accept',
                              },
                            )}
                            rejectLabel={t(
                              'profile.reject',
                              {
                                defaultValue:
                                  'Reject',
                              },
                            )}
                            onAccept={() =>
                              handleAcceptRequest(
                                request,
                              )
                            }
                            onReject={() =>
                              handleRejectRequest(
                                request.id,
                              )
                            }
                          />
                        ),
                      )}
                    </div>
                  ) : (
                    <EmptyState
                      text={t(
                        'profile.noRequests',
                        {
                          defaultValue:
                            'No pending requests',
                        },
                      )}
                    />
                  )}
                </div>
              </div>
            )}

            {activeTab ===
              'statistics' && (
              <div>
                <h2 className="mb-8 font-display text-[36px] uppercase leading-none text-brand-red">
                  {t(
                    'profile.statistics',
                    {
                      defaultValue:
                        'Statistics',
                    },
                  )}
                </h2>

                <div className="grid gap-4 md:grid-cols-3">
                  <LargeStatCard
                    value={games}
                    label={t(
                      'profile.totalGames',
                      {
                        defaultValue:
                          'Total games',
                      },
                    )}
                  />

                  <LargeStatCard
                    value={wins}
                    label={t(
                      'profile.totalWins',
                      {
                        defaultValue:
                          'Total wins',
                      },
                    )}
                  />

                  <LargeStatCard
                    value={
                      winPercentage
                    }
                    suffix="%"
                    label={t(
                      'profile.winRate',
                      {
                        defaultValue:
                          'Win rate',
                      },
                    )}
                  />
                </div>
              </div>
            )}

            {activeTab ===
              'leaderboard' && (
              <div>
                <h2 className="mb-8 font-display text-[36px] uppercase leading-none text-brand-red">
                  {t(
                    'profile.leaderboard',
                    {
                      defaultValue:
                        'Leaderboard',
                    },
                  )}
                </h2>

                <EmptyState
                  text={t(
                    'profile.leaderboardComingSoon',
                    {
                      defaultValue:
                        'Leaderboard data will appear here',
                    },
                  )}
                />
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Модалка редактирования */}
      {editModalOpen && (
        <div
          className="
            fixed
            inset-0
            z-50
            flex
            items-center
            justify-center
            overflow-y-auto
            bg-[#615050]/35
            px-4
            py-8
            backdrop-blur-[2px]
          "
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeEditModal();
            }
          }}
        >
          <div
            className="
              relative
              w-full
              max-w-[560px]
              rounded-[10px]
              bg-background
              px-8
              py-10
              shadow-[-8px_8px_32px_0_rgba(97,80,80,0.25)]
              md:px-12
            "
          >
            <button
              type="button"
              onClick={closeEditModal}
              aria-label="Close"
              className="
                absolute
                right-5
                top-5
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-full
                border
                border-[#D9D5D1]
                text-[22px]
                text-[#615050]
                transition-colors
                hover:bg-[#D9D9D9]/20
              "
            >
              ×
            </button>

            <h2 className="pr-12 font-display text-[40px] uppercase leading-none text-brand-red">
              {t(
                'profile.editProfile',
                {
                  defaultValue:
                    'Edit profile',
                },
              )}
            </h2>

            <div className="mt-8 flex flex-col items-center">
              <button
                type="button"
                onClick={() =>
                  fileRef.current?.click()
                }
                className="
                  group
                  relative
                  h-28
                  w-28
                  overflow-hidden
                  rounded-full
                  bg-[#D9D5D1]
                  outline-none
                  focus:ring-2
                  focus:ring-brand-red
                "
              >
                {avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt={user.username}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center font-display text-[44px] uppercase text-white">
                    {user.username
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                )}

                <span
                  className="
                    absolute
                    inset-0
                    flex
                    items-center
                    justify-center
                    bg-black/40
                    px-3
                    text-center
                    text-xs
                    font-medium
                    uppercase
                    text-white
                    opacity-0
                    transition-opacity
                    group-hover:opacity-100
                  "
                >
                  {t(
                    'profile.changeAvatar',
                  )}
                </span>
              </button>

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={
                  handleAvatarChange
                }
              />

              <p className="mt-3 min-h-5 text-xs text-[#615050]">
                {avatarStatus ===
                  'uploading' &&
                  t(
                    'profile.avatarUploading',
                  )}

                {avatarStatus ===
                  'done' &&
                  t(
                    'profile.avatarUpdated',
                  )}

                {avatarStatus ===
                  'error' &&
                  t(
                    'profile.avatarUploadFailed',
                  )}
              </p>
            </div>

            <form
              onSubmit={handleSave}
              className="mt-5 space-y-5"
            >
              <ProfileInput
                label={t(
                  'profile.username',
                )}
                type="text"
                value={username}
                required
                error={
                  fieldErrors.username
                    ? t(
                        fieldErrors.username,
                      )
                    : undefined
                }
                onChange={setUsername}
              />

              {!isOAuthUser && (
                <>
                  <div className="border-t border-[#EEE9E6] pt-6">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-[#615050]">
                      {t(
                        'profile.changePassword',
                      )}
                    </h3>
                  </div>

                  <ProfileInput
                    label={t(
                      'profile.currentPassword',
                    )}
                    type="password"
                    value={
                      currentPassword
                    }
                    autoComplete="current-password"
                    error={
                      fieldErrors.currentPassword
                        ? t(
                            fieldErrors.currentPassword,
                          )
                        : undefined
                    }
                    onChange={
                      setCurrentPassword
                    }
                  />

                  <ProfileInput
                    label={t(
                      'profile.newPassword',
                    )}
                    type="password"
                    value={newPassword}
                    autoComplete="new-password"
                    error={
                      fieldErrors.newPassword
                        ? t(
                            fieldErrors.newPassword,
                          )
                        : undefined
                    }
                    onChange={
                      setNewPassword
                    }
                  />

                  <ProfileInput
                    label={t(
                      'profile.confirmPassword',
                    )}
                    type="password"
                    value={
                      confirmPassword
                    }
                    autoComplete="new-password"
                    error={
                      fieldErrors.confirmPassword
                        ? t(
                            fieldErrors.confirmPassword,
                          )
                        : undefined
                    }
                    onChange={
                      setConfirmPassword
                    }
                  />
                </>
              )}

              {saveStatus ===
                'error' &&
                saveError && (
                  <p className="text-center text-sm text-red-600">
                    {saveError}
                  </p>
                )}

              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <button
                  type="submit"
                  disabled={
                    saveStatus ===
                    'saving'
                  }
                  className="
                    h-[46px]
                    flex-1
                    rounded-full
                    bg-brand-red
                    px-8
                    text-[14px]
                    font-medium
                    uppercase
                    text-white
                    transition-colors
                    hover:bg-[#D9361F]
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  {saveStatus ===
                  'saving'
                    ? t(
                        'profile.saving',
                      )
                    : saveStatus ===
                        'saved'
                      ? t(
                          'profile.saved',
                        )
                      : t(
                          'profile.saveChanges',
                        )}
                </button>

                <button
                  type="button"
                  onClick={closeEditModal}
                  className="
                    h-[46px]
                    flex-1
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
                  {t('common.cancel', {
                    defaultValue:
                      'Cancel',
                  })}
                </button>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="
                  h-[46px]
                  w-full
                  rounded-full
                  border
                  border-brand-red
                  px-8
                  text-[14px]
                  font-medium
                  uppercase
                  text-brand-red
                  transition-colors
                  hover:bg-brand-red
                  hover:text-white
                "
              >
                {t('profile.logout')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <div
      className="
        flex
        min-h-[106px]
        flex-col
        items-center
        justify-center
        rounded-[10px]
        border
        border-[#D9D5D1]
        bg-white
        px-4
        text-center
        text-[#615050]
      "
    >
      <span className="text-[24px] font-bold leading-none">
        {value}
      </span>

      <span className="mt-3 text-[14px]">
        {label}
      </span>
    </div>
  );
}

function LargeStatCard({
  value,
  label,
  suffix = '',
}: {
  value: number;
  label: string;
  suffix?: string;
}) {
  return (
    <div className="rounded-[10px] border border-[#D9D5D1] bg-background px-6 py-8 text-center">
      <p className="font-display text-[44px] uppercase leading-none text-brand-red">
        {value}
        {suffix}
      </p>

      <p className="mt-4 text-sm font-medium uppercase text-[#615050]">
        {label}
      </p>
    </div>
  );
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        h-[46px]
        min-w-[140px]
        rounded-full
        border
        px-7
        text-[14px]
        font-medium
        transition-colors
        ${
          active
            ? 'border-brand-green bg-brand-green text-white hover:bg-[#808979]'
            : 'border-[#D9D5D1] text-[#615050] hover:bg-[#D9D9D9]/20'
        }
      `}
    >
      {children}
    </button>
  );
}

function FriendRow({
  friend,
  playLabel,
  deleteLabel,
  onPlay,
  onDelete,
}: {
  friend: Friend;
  playLabel: string;
  deleteLabel: string;
  onPlay: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="grid items-center gap-3 sm:grid-cols-[minmax(0,1fr)_138px_138px]">
      <div className="flex min-w-0 items-center gap-3">
        <SmallAvatar
          username={friend.username}
          avatarPath={
            friend.avatarPath
          }
        />

        <p className="truncate text-[18px] font-semibold text-[#615050]">
          {friend.username}
        </p>
      </div>

      <button
        type="button"
        onClick={onPlay}
        className="
          h-[30px]
          rounded-full
          bg-brand-green
          px-5
          text-[12px]
          font-medium
          uppercase
          text-white
          transition-colors
          hover:bg-[#808979]
        "
      >
        {playLabel}
      </button>

      <button
        type="button"
        onClick={onDelete}
        className="
          h-[30px]
          rounded-full
          border
          border-[#D9D5D1]
          px-5
          text-[12px]
          font-medium
          uppercase
          text-[#615050]
          transition-colors
          hover:bg-[#D9D9D9]/20
        "
      >
        {deleteLabel}
      </button>
    </div>
  );
}

function RequestRow({
  request,
  acceptLabel,
  rejectLabel,
  onAccept,
  onReject,
}: {
  request: FriendRequest;
  acceptLabel: string;
  rejectLabel: string;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <div className="grid items-center gap-3 sm:grid-cols-[minmax(0,1fr)_138px_138px]">
      <div className="flex min-w-0 items-center gap-3">
        <SmallAvatar
          username={
            request.username
          }
          avatarPath={
            request.avatarPath
          }
        />

        <p className="truncate text-[18px] font-semibold text-[#615050]">
          {request.username}
        </p>
      </div>

      <button
        type="button"
        onClick={onAccept}
        className="
          h-[30px]
          rounded-full
          bg-brand-green
          px-5
          text-[12px]
          font-medium
          uppercase
          text-white
          transition-colors
          hover:bg-[#808979]
        "
      >
        {acceptLabel}
      </button>

      <button
        type="button"
        onClick={onReject}
        className="
          h-[30px]
          rounded-full
          border
          border-[#D9D5D1]
          px-5
          text-[12px]
          font-medium
          uppercase
          text-[#615050]
          transition-colors
          hover:bg-[#D9D9D9]/20
        "
      >
        {rejectLabel}
      </button>
    </div>
  );
}

function SmallAvatar({
  username,
  avatarPath,
}: {
  username: string;
  avatarPath: string | null;
}) {
  return (
    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-[#D9D5D1]">
      {avatarPath ? (
        <img
          src={avatarPath}
          alt={username}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-xs font-bold uppercase text-white">
          {username
            .charAt(0)
            .toUpperCase()}
        </span>
      )}
    </div>
  );
}

function EmptyState({
  text,
}: {
  text: string;
}) {
  return (
    <div className="flex min-h-[180px] items-center justify-center rounded-[10px] border border-dashed border-[#D9D5D1] px-5">
      <p className="text-center text-sm text-zinc-400">
        {text}
      </p>
    </div>
  );
}

function ProfileInput({
  label,
  type,
  value,
  error,
  required,
  autoComplete,
  onChange,
}: {
  label: string;
  type: 'text' | 'password';
  value: string;
  error?: string;
  required?: boolean;
  autoComplete?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-[#615050]">
        {label}
      </label>

      <input
        type={type}
        value={value}
        required={required}
        autoComplete={autoComplete}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className={`
          h-[46px]
          w-full
          rounded-[10px]
          border
          bg-white
          px-4
          text-sm
          text-[#615050]
          outline-none
          transition-colors
          focus:border-brand-red
          ${
            error
              ? 'border-red-500'
              : 'border-[#D9D5D1]'
          }
        `}
      />

      {error && (
        <p className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}