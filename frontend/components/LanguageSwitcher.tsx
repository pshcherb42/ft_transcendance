// components/LanguageSwitcher.tsx
'use client';

import { useTranslation } from 'react-i18next';

const STORAGE_KEY = 'lang';

const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'ru', label: 'Русский' },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  function handleChange(code: string) {
    i18n.changeLanguage(code);
    window.localStorage.setItem(STORAGE_KEY, code);
  }

  return (
    <select
      value={i18n.language}
      onChange={(e) => handleChange(e.target.value)}
      className="bg-transparent border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300"
      aria-label="Language"
    >
      {LANGS.map((l) => (
        <option key={l.code} value={l.code} className="bg-zinc-900">
          {l.label}
        </option>
      ))}
    </select>
  );
}