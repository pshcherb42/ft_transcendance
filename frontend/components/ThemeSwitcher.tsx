'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'theme';

type ThemeChoice = 'light' | 'dark';

function applyTheme(choice: ThemeChoice) {
  document.documentElement.setAttribute('data-theme', choice);
}

// Only safe to call on the client — reads whatever theme was chosen last.
function readInitialTheme(): ThemeChoice {
  if (typeof window === 'undefined') return 'light';
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'dark'
      ? 'dark'
      : 'light';
  } catch {
    return 'light';
  }
}

// Small sun/moon toggle, sitting inline in the Footer next to LanguageSwitcher.
export default function ThemeSwitcher() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<ThemeChoice>('light');

  useEffect(() => {
    queueMicrotask(() => {
      setTheme(readInitialTheme());
      setMounted(true);
    });
  }, []);

  useEffect(() => {
    if (mounted) applyTheme(theme);
  }, [theme, mounted]);

  if (!mounted) {
    return (
      <div className='h-7 w-7 shrink-0 rounded-full border border-border' />
    );
  }

  function toggle() {
    const next: ThemeChoice = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      type='button'
      onClick={toggle}
      aria-label={
        theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'
      }
      className={`
        flex
        h-7
        w-7
        shrink-0
        items-center
        justify-center
        rounded-full
        border
        border-border
        transition-colors
        active:scale-90
        ${theme === 'light' ? 'bg-[#232338]' : 'bg-[#FEF3C7]'}
      `}
    >
      {theme === 'dark' ? (
        // Sun — sits on the light circle
        <svg
          key='sun'
          className='theme-icon'
          width='15'
          height='15'
          viewBox='0 0 24 24'
          fill='none'
          xmlns='http://www.w3.org/2000/svg'
        >
          <circle cx='12' cy='12' r='4' stroke='#F59E0B' strokeWidth='2' />
          <path
            d='M12 2v2M12 20v2M4 12H2M22 12h-2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41'
            stroke='#F59E0B'
            strokeWidth='2'
            strokeLinecap='round'
          />
        </svg>
      ) : (
        // Moon — sits on the dark circle
        <svg
          key='moon'
          className='theme-icon'
          width='15'
          height='15'
          viewBox='0 0 24 24'
          fill='none'
          xmlns='http://www.w3.org/2000/svg'
        >
          <path
            d='M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z'
            stroke='#E5E7EB'
            strokeWidth='2'
            strokeLinejoin='round'
          />
        </svg>
      )}
    </button>
  );
}
