'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';

export default function TermsOfServicePage() {
  const { t } = useTranslation();
  const s2List = t('legal.terms.s2.list', { returnObjects: true }) as string[];
  const s3List = t('legal.terms.s3.list', { returnObjects: true }) as string[];
  const s4List = t('legal.terms.s4.list', { returnObjects: true }) as string[];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200">
      <div className="mx-auto max-w-2xl px-6 py-16 sm:py-20">
        <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors">
          {t('legal.back')}
        </Link>

        <header className="mt-8 mb-12 border-b border-neutral-800 pb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-white">{t('legal.terms.title')}</h1>
          <p className="mt-2 text-sm text-neutral-500">{t('legal.lastUpdated', { date: '14.07.2026' })}</p>
        </header>

        <article
          className="
            space-y-8
            [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-white [&_h2]:mt-10 [&_h2]:mb-3
            [&_p]:text-[15px] [&_p]:leading-7 [&_p]:text-neutral-400
            [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ul]:text-[15px] [&_ul]:text-neutral-400
            [&_li]:leading-6
            [&_a]:text-neutral-200 [&_a]:underline [&_a]:underline-offset-2 [&_a]:decoration-neutral-700 hover:[&_a]:decoration-neutral-400
          "
        >
          <p>{t('legal.terms.intro')}</p>

          <section>
            <h2>{t('legal.terms.s1.heading')}</h2>
            <p>{t('legal.terms.s1.body')}</p>
          </section>

          <section>
            <h2>{t('legal.terms.s2.heading')}</h2>
            <ul>{s2List.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>

          <section>
            <h2>{t('legal.terms.s3.heading')}</h2>
            <p>{t('legal.terms.s3.intro')}</p>
            <ul>{s3List.map((item) => <li key={item}>{item}</li>)}</ul>
            <p>{t('legal.terms.s3.outro')}</p>
          </section>

          <section>
            <h2>{t('legal.terms.s4.heading')}</h2>
            <ul>{s4List.map((item) => <li key={item}>{item}</li>)}</ul>
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
              <a href="mailto:polin14896@gmail.com">polin14896@gmail.com</a>
            </p>
          </section>
        </article>
      </div>
    </div>
  );
}