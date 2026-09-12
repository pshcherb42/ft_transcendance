'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';

export default function TermsOfServicePage() {
  const { t } = useTranslation();
  const router = useRouter();

  const s2List = t('legal.terms.s2.list', {
    returnObjects: true,
  }) as string[];

  const s3List = t('legal.terms.s3.list', {
    returnObjects: true,
  }) as string[];

  const s4List = t('legal.terms.s4.list', {
    returnObjects: true,
  }) as string[];

  return (
    <div className="relative flex min-h-[calc(100dvh-48px)] flex-col bg-background">
      <main className="flex flex-1 flex-col">
        <header className="px-8 pt-8 md:px-16">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="
            h-[46px]
            min-w-[190px]
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
          "
        >
          {t('game.button.backToMenu')}
        </button>
      </header>

    <section className="flex-1 px-8 pt-12 pb-12 md:px-16">
    <div
      className="
        mx-auto
        max-w-5xl
        rounded-[10px]
        bg-surface
        px-8
        py-10
        shadow-[-8px_8px_32px_var(--card-shadow)]
      "
    >
      <section className="pb-8">
          <h1
            className="
              text-[48px]
              font-display
              uppercase
              leading-none
              text-brand-red
            "
          >
            {t('legal.terms.title')}
          </h1>

          <p className="mt-3 text-[14px] text-muted-foreground">
            {t('legal.lastUpdated', { date: '14.07.2026' })}
          </p>
        </section>
      <article
          className="

            [&_section]:border-b
            [&_section]:border-surface
            [&_section]:pb-8

            [&_section:last-child]:border-b-0
            [&_section:last-child]:pb-0

            [&_h2]:mb-3
            [&_h2]:mt-8
            [&_h2]:text-[18px]
            [&_h2]:font-semibold
            [&_h2]:leading-7
            [&_h2]:text-foreground

            [&_p]:text-[15px]
            [&_p]:leading-7
            [&_p]:text-muted-foreground

            [&_ul]:mt-4
            [&_ul]:space-y-2
            [&_ul]:pl-5
            [&_ul]:text-[15px]
            [&_ul]:text-muted-foreground

            [&_li]:relative
            [&_li]:list-none
            [&_li]:leading-7

            [&_li]:before:absolute
            [&_li]:before:-left-5
            [&_li]:before:top-[11px]
            [&_li]:before:h-1.5
            [&_li]:before:w-1.5
            [&_li]:before:rounded-full
            [&_li]:before:bg-brand-red

            [&_a]:font-medium
            [&_a]:text-brand-red
            [&_a]:underline
            [&_a]:decoration-brand-red/30
            [&_a]:underline-offset-4
            [&_a]:transition-colors

            hover:[&_a]:text-brand-red-dark
            hover:[&_a]:decoration-brand-red-dark
          "
        >
          <p className="mb-8">{t('legal.terms.intro')}</p>

          <section>
            <h2>{t('legal.terms.s1.heading')}</h2>
            <p>{t('legal.terms.s1.body')}</p>
          </section>

          <section>
            <h2>{t('legal.terms.s2.heading')}</h2>
            <ul>
              {s2List.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2>{t('legal.terms.s3.heading')}</h2>
            <p>{t('legal.terms.s3.intro')}</p>

            <ul>
              {s3List.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            <p className="mt-4">{t('legal.terms.s3.outro')}</p>
          </section>

          <section>
            <h2>{t('legal.terms.s4.heading')}</h2>

            <ul>
              {s4List.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2>{t('legal.terms.s5.heading')}</h2>
            <p>{t('legal.terms.s5.body')}</p>
          </section>

          <section>
            <h2>{t('legal.terms.s6.heading')}</h2>
            <p>{t('legal.terms.s6.body')}</p>
          </section>

          <section>
            <h2>{t('legal.terms.s7.heading')}</h2>
            <p>{t('legal.terms.s7.body')}</p>
          </section>

          <section>
            <h2>{t('legal.terms.s8.heading')}</h2>
            <p>{t('legal.terms.s8.body')}</p>
          </section>

          <section>
            <h2>{t('legal.terms.s9.heading')}</h2>
            <p>{t('legal.terms.s9.body')}</p>
          </section>

          <section>
            <h2>{t('legal.terms.s10.heading')}</h2>
            <p>{t('legal.terms.s10.body')}</p>
          </section>

          <section>
            <h2>{t('legal.terms.s11.heading')}</h2>
            <p>{t('legal.terms.s11.body')}</p>
          </section>

          <section>
            <h2>{t('legal.terms.s12.heading')}</h2>

            <p>
              {t('legal.terms.s12.pre')}{' '}
              <a href="mailto:polin14896@gmail.com">
                polin14896@gmail.com
              </a>
            </p>
          </section>
        </article>
        </div>
        </section>
      </main>
    </div>
  );
}