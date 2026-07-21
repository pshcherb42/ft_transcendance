// components/LanguageSwitcher.tsx
'use client';

import { useTranslation } from 'react-i18next';

const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'ru', label: 'Русский' },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <select
      value={i18n.language}
      onChange={(e) => i18n.changeLanguage(e.target.value)}
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