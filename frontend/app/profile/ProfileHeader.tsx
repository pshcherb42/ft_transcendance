'use client';

import { useTranslation } from 'react-i18next';

type ProfileHeaderProps = {
  username: string;
  email: string;
  avatarPath: string | null;
  games: number;
  wins: number;
  losses: number;
  winPercentage: number;
};

export default function ProfileHeader({
  username,
  email,
  avatarPath,
  games,
  wins,
  losses,
  winPercentage,
}: ProfileHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="grid items-start gap-10 lg:grid-cols-[360px_1fr] xl:gap-40">
      <div className="flex items-center gap-6">
        <div
          className="
            h-[140px]
            w-[140px]
            shrink-0
            overflow-hidden
            rounded-full
            bg-[#D9D5D1]
          "
        >
          {avatarPath ? (
            <img
              src={avatarPath}
              alt={username}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center font-display text-[56px] uppercase text-white">
              {username.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div className="min-w-0">
          <h1 className="break-words font-display text-[clamp(2rem,3vw,40px)] uppercase leading-none text-brand-red">
            {username}
          </h1>

          <p className="mt-3 break-all text-[15px] text-[#615050]">
            {email}
          </p>

          <div className="mt-4 flex items-center gap-3">
            <span className="h-[13px] w-[13px] rounded-full bg-[#98C47C]" />

            <span className="text-[14px] font-medium uppercase text-[#615050]">
              {t('profile.online', {
                defaultValue: 'Online',
              })}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4 xl:gap-8">
        <StatCard
          value={games}
          label={t('profile.games')}
        />

        <StatCard
          value={wins}
          label={t('profile.wins')}
        />

        <StatCard
          value={losses}
          label={t('profile.losses')}
        />

        <StatCard
          value={`${winPercentage}%`}
          label={t('profile.winRate')}
        />
      </div>
    </div>
  );
}

function StatCard({
  value,
  label,
}: {
  value: number | string;
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