'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';

export default function PrivacyPolicyPage() {
  const { t } = useTranslation();
  const rows = t('legal.privacy.s2.table.rows', { returnObjects: true }) as string[][];
  const headers = t('legal.privacy.s2.table.headers', { returnObjects: true }) as string[];
  const s3List = t('legal.privacy.s3.list', { returnObjects: true }) as string[];
  const s4List = t('legal.privacy.s4.list', { returnObjects: true }) as string[];
  const s5List = t('legal.privacy.s5.list', { returnObjects: true }) as string[];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200">
      <div className="mx-auto max-w-2xl px-6 py-16 sm:py-20">
        <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors">
          {t('legal.back')}
        </Link>

        <header className="mt-8 mb-12 border-b border-neutral-800 pb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-white">{t('legal.privacy.title')}</h1>
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
            [&_table]:w-full [&_table]:text-sm [&_table]:border-collapse
            [&_th]:text-left [&_th]:font-medium [&_th]:text-neutral-300 [&_th]:border-b [&_th]:border-neutral-800 [&_th]:pb-2
            [&_td]:py-2 [&_td]:border-b [&_td]:border-neutral-900 [&_td]:text-neutral-400 [&_td]:align-top
          "
        >
          <p>{t('legal.privacy.intro')}</p>

          <section>
            <h2>{t('legal.privacy.s1.heading')}</h2>
            <p>
              {t('legal.privacy.s1.body')}{' '}
              <a href="mailto:polin14896@gmail.com">polin14896@gmail.com</a> ·{' '}
              <a href="https://github.com/pshcherb42/ft_transcendance">https://github.com/pshcherb42/ft_transcendance</a>.
            </p>
          </section>

          <section>
            <h2>{t('legal.privacy.s2.heading')}</h2>
            <table>
              <thead>
                <tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => <td key={j}>{cell}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
            <p>{t('legal.privacy.s2.outro')}</p>
          </section>

          <section>
            <h2>{t('legal.privacy.s3.heading')}</h2>
            <ul>{s3List.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>

          <section>
            <h2>{t('legal.privacy.s4.heading')}</h2>
            <p>{t('legal.privacy.s4.intro')}</p>
            <ul>{s4List.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>

          <section>
            <h2>{t('legal.privacy.s5.heading')}</h2>
            <p>{t('legal.privacy.s5.intro')}</p>
            <ul>{s5List.map((item) => <li key={item}>{item}</li>)}</ul>
            <p>
              {t('legal.privacy.s5.contactPre')}{' '}
              <a href="mailto:polin14896@gmail.com">polin14896@gmail.com</a>
            </p>
          </section>

          <section>
            <h2>{t('legal.privacy.s6.heading')}</h2>
            <p>{t('legal.privacy.s6.body')}</p>
          </section>

          <section>
            <h2>{t('legal.privacy.s7.heading')}</h2>
            <p>{t('legal.privacy.s7.body')}</p>
          </section>

          <section>
            <h2>{t('legal.privacy.s8.heading')}</h2>
            <p>{t('legal.privacy.s8.body')}</p>
          </section>

          <section>
            <h2>{t('legal.privacy.s9.heading')}</h2>
            <p>{t('legal.privacy.s9.body')}</p>
          </section>

          <section>
            <h2>{t('legal.privacy.s10.heading')}</h2>
            <p>{t('legal.privacy.s10.body')}</p>
          </section>

          <section>
            <h2>{t('legal.privacy.s11.heading')}</h2>
            <p>
              {t('legal.privacy.s11.pre')}{' '}
              <a href="mailto:polin14896@gmail.com">polin14896@gmail.com</a>
            </p>
          </section>
        </article>
      </div>
    </div>
  );
}