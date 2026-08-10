// components/LanguageSwitcher.tsx
'use client';

import { useTranslation } from 'react-i18next';

const STORAGE_KEY = 'lang';

const LANGS = [
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
  { code: 'lv', label: 'LV' },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  function handleChange(code: string) {
    i18n.changeLanguage(code);
    window.localStorage.setItem(STORAGE_KEY, code);
  }

  const currentLanguage = i18n.language.split('-')[0];

  return (
    <div className="flex items-center justify-center gap-2">
      {LANGS.map((language, index) => {
        const isActive =
          currentLanguage === language.code;
  
        return (
          <div
            key={language.code}
            className="contents"
          >
            <button
              type="button"
              onClick={() =>
                handleChange(language.code)
              }
              className={`
                text-xs
                font-medium
                uppercase
                tracking-widest
                transition-colors
                ${
                  isActive
                    ? 'text-brand-red'
                    : 'text-[#615050] hover:text-brand-red'
                }
              `}
            >
              {language.label}
            </button>
  
            {index < LANGS.length - 1 && (
              <span className="text-[#B5ACAC]">
                /
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}