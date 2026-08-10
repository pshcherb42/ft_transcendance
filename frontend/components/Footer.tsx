'use client';

import Link from 'next/link';
import LanguageSwitcher from './LanguageSwitcher';
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer
      className="
flex
    w-full
    flex-col
    items-center
    justify-center
    gap-3
    bg-[#EDECE8]
    px-4
    py-3

    min-[600px]:h-[48px]
    min-[600px]:flex-row
    min-[600px]:justify-between
    min-[600px]:px-6

    md:px-10
    lg:px-16
      "
    >
      {/* Terms + Privacy */}
      <div
        className="
          flex
          shrink-0
          items-center
          justify-center
          gap-4
          sm:gap-6
          lg:gap-[34px]
        "
      >
        <Link
          href="/terms"
          className="
            whitespace-nowrap
            text-xs
            uppercase
            tracking-widest
            text-[#615050]
            underline-offset-4
            hover:underline
          "
        >
          {t('legal.terms.title')}
        </Link>

        <span className="text-[#B5ACAC]">|</span>

        <Link
          href="/privacy"
          className="
            whitespace-nowrap
            text-xs
            uppercase
            tracking-widest
            text-[#615050]
            underline-offset-4
            hover:underline
          "
        >
          {t('legal.privacy.title')}
        </Link>
      </div>

      {/* Languages */}
      <div className="flex w-full min-[600px]:w-auto justify-center">
        <LanguageSwitcher />
      </div>
    </footer>
  );
}