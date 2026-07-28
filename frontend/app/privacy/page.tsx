'use client';

import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';

export default function PrivacyPolicyPage() {
  const { t } = useTranslation();
  const router = useRouter();

  const rows = t('legal.privacy.s2.table.rows', {
    returnObjects: true,
  }) as string[][];

  const headers = t('legal.privacy.s2.table.headers', {
    returnObjects: true,
  }) as string[];

  const s3List = t('legal.privacy.s3.list', {
    returnObjects: true,
  }) as string[];

  const s4List = t('legal.privacy.s4.list', {
    returnObjects: true,
  }) as string[];

  const s5List = t('legal.privacy.s5.list', {
    returnObjects: true,
  }) as string[];

  return (
    <div className="relative flex min-h-[calc(100dvh-48px)] flex-col bg-[#F4F2EE]">
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
              border-[#D9D5D1]
              px-8
              text-[14px]
              font-medium
              uppercase
              text-[#615050]
              transition-colors
              hover:bg-[#D9D9D9]/20
            "
          >
            {t('game.button.backToMenu')}
          </button>
        </header>

        <section className="flex-1 px-8 pb-12 pt-12 md:px-16">
          <div
            className="
              mx-auto
              max-w-5xl
              rounded-[10px]
              bg-white
              px-8
              py-10
              shadow-[-8px_8px_32px_rgba(193,168,163,0.25)]
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
                {t('legal.privacy.title')}
              </h1>

              <p className="mt-3 text-[14px] text-[#8A817D]">
                {t('legal.lastUpdated', {
                  date: '14.07.2026',
                })}
              </p>
            </section>

            <article
              className="
                [&_section]:border-b
                [&_section]:border-[#EDECE8]
                [&_section]:pb-8

                [&_section:last-child]:border-b-0
                [&_section:last-child]:pb-0

                [&_h2]:mb-3
                [&_h2]:mt-8
                [&_h2]:text-[18px]
                [&_h2]:font-semibold
                [&_h2]:leading-7
                [&_h2]:text-[#1A1A1A]

                [&_p]:text-[15px]
                [&_p]:leading-7
                [&_p]:text-[#615050]

                [&_ul]:mt-4
                [&_ul]:space-y-2
                [&_ul]:pl-5
                [&_ul]:text-[15px]
                [&_ul]:text-[#615050]

                [&_li]:relative
                [&_li]:list-none
                [&_li]:leading-7

                [&_li]:before:absolute
                [&_li]:before:-left-5
                [&_li]:before:top-[11px]
                [&_li]:before:h-1.5
                [&_li]:before:w-1.5
                [&_li]:before:rounded-full
                [&_li]:before:bg-[#EE4424]

                [&_a]:break-all
                [&_a]:font-medium
                [&_a]:text-[#EE4424]
                [&_a]:underline
                [&_a]:decoration-[#EE4424]/30
                [&_a]:underline-offset-4
                [&_a]:transition-colors

                hover:[&_a]:text-[#D9361F]
                hover:[&_a]:decoration-[#D9361F]

                [&_table]:mt-5
                [&_table]:w-full
                [&_table]:border-collapse
                [&_table]:text-[14px]

                [&_thead]:bg-[#F4F2EE]

                [&_th]:border
                [&_th]:border-[#E1DDD8]
                [&_th]:px-4
                [&_th]:py-3
                [&_th]:text-left
                [&_th]:font-semibold
                [&_th]:text-[#1A1A1A]

                [&_td]:border
                [&_td]:border-[#E1DDD8]
                [&_td]:px-4
                [&_td]:py-3
                [&_td]:align-top
                [&_td]:leading-6
                [&_td]:text-[#615050]
              "
            >
              <p className="mb-8">{t('legal.privacy.intro')}</p>

              <section>
                <h2>{t('legal.privacy.s1.heading')}</h2>

                <p>
                  {t('legal.privacy.s1.body')}{' '}
                  <a href="mailto:polin14896@gmail.com">
                    polin14896@gmail.com
                  </a>{' '}
                  ·{' '}
                  <a
                    href="https://github.com/pshcherb42/ft_transcendance"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    https://github.com/pshcherb42/ft_transcendance
                  </a>
                  .
                </p>
              </section>

              <section>
                <h2>{t('legal.privacy.s2.heading')}</h2>

                <div className="overflow-x-auto">
                  <table>
                    <thead>
                      <tr>
                        {headers.map((header) => (
                          <th key={header}>{header}</th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {rows.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {row.map((cell, cellIndex) => (
                            <td key={cellIndex}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="mt-5">
                  {t('legal.privacy.s2.outro')}
                </p>
              </section>

              <section>
                <h2>{t('legal.privacy.s3.heading')}</h2>

                <ul>
                  {s3List.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>

              <section>
                <h2>{t('legal.privacy.s4.heading')}</h2>

                <p>{t('legal.privacy.s4.intro')}</p>

                <ul>
                  {s4List.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>

              <section>
                <h2>{t('legal.privacy.s5.heading')}</h2>

                <p>{t('legal.privacy.s5.intro')}</p>

                <ul>
                  {s5List.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>

                <p className="mt-4">
                  {t('legal.privacy.s5.contactPre')}{' '}
                  <a href="mailto:polin14896@gmail.com">
                    polin14896@gmail.com
                  </a>
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