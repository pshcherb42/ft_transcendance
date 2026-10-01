'use client';

import { Trans, useTranslation } from 'react-i18next';

// Mobile-only landing for /login and /register: title + two buttons,
// shown before the form is opened.
export default function AuthMobileWelcome({
  onLogin,
  onRegister,
}: {
  onLogin: () => void;
  onRegister: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div
      className='
              flex
              w-full
              max-w-[720px]
              flex-1
              flex-col
              justify-start
              pt-8
              sm:pt-12
              md:pt-16
            '
    >
      <span className='text-xs font-bold uppercase tracking-widest text-brand-green'>
        42 Transcendence
      </span>

      <h1
        className='
                mt-4
                font-display
                text-[72px]
                uppercase
                leading-[1.1]
                max-[600px]:text-[64px]
                max-[480px]:text-[56px]
                max-[400px]:text-[48px]
                max-[350px]:text-[42px]
              '
      >
        <Trans i18nKey='auth.title'>
          <span className='text-brand-red'>nuestro Pong</span>
        </Trans>
      </h1>

      <p
        className='
                mt-5
                max-w-[720px]
                font-light
                leading-snug
                text-foreground
                text-[clamp(1rem,2.4vw,1.75rem)]
              '
      >
        {t('auth.subtitle')}
      </p>

      <div className='mt-10 flex flex-col gap-3'>
        <button
          type='button'
          onClick={onLogin}
          className='
                  h-[48px]
                  w-full
                  rounded-full
                  bg-brand-red
                  px-8
                  text-[14px]
                  font-medium
                  uppercase
                  text-white
                  transition-colors
                  hover:bg-brand-red-dark
                '
        >
          {t('auth.login')}
        </button>

        <button
          type='button'
          onClick={onRegister}
          className='
                  h-[48px]
                  w-full
                  rounded-full
                  border
                  border-border
                  px-8
                  text-[14px]
                  font-medium
                  uppercase
                  text-muted-foreground
                  transition-colors
                  hover:bg-border/20
                '
        >
          {t('auth.createAccount')}
        </button>
      </div>
    </div>
  );
}
