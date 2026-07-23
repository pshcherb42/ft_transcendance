'use client';
import Link from "next/link";
import LanguageSwitcher from "./LanguageSwitcher";
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="flex h-[48px] items-center justify-end gap-[34px] bg-[#EDECE8] px-8 md:px-16 xl:px-[64px]">
    <a
      href="/terms"
      className="text-xs uppercase tracking-widest text-[#615050] underline-offset-4 hover:underline"
    >
      {t('legal.terms.title')}
    </a>

    <span className="text-[#B5ACAC]">|</span>

    <a
      href="/privacy"
      className="text-xs uppercase tracking-widest text-[#615050] underline-offset-4 hover:underline"
    >
      {t('legal.privacy.title')}
    </a>
     <LanguageSwitcher />
  </footer>
  );
}