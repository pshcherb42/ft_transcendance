'use client';

import { useEffect } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import i18n from '@/i18n/config';

const STORAGE_KEY = 'lang';
const SUPPORTED = ['en', 'es', 'lv'];

function LanguageSync() {
  const { i18n } = useTranslation();

  // Runs once, after hydration. Applying a previously chosen language here
  // is a normal post-mount state update — it happens after React has
  // already reconciled the server-rendered English HTML, so there's no
  // server/client mismatch. Nothing here reacts to browser language.
  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED.includes(saved) && saved !== i18n.language) {
      i18n.changeLanguage(saved);
    }
  }, [i18n]);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  return null;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <LanguageSync />
      {children}
    </I18nextProvider>
  );
}