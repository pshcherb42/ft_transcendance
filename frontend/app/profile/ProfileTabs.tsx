'use client';

import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import type { ProfileTab } from './types';

type ProfileTabsProps = {
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
};

export default function ProfileTabs({
  activeTab,
  onTabChange,
}: ProfileTabsProps) {
  const { t } = useTranslation();

  return (
    <div className="mt-10 flex flex-wrap gap-3">
      <TabButton
        active={activeTab === 'friends'}
        onClick={() => onTabChange('friends')}
      >
        {t('stats.leaderboard.friends')}
      </TabButton>

      <TabButton
        active={activeTab === 'statistics'}
        onClick={() =>
          onTabChange('statistics')
        }
      >
        {t('stats.title')}
      </TabButton>

      <TabButton
        active={activeTab === 'leaderboard'}
        onClick={() =>
          onTabChange('leaderboard')
        }
      >
        {t('stats.leaderboard.title')}
      </TabButton>
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