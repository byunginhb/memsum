'use client';

import { DotsLogo } from '@/components/DotsLogo';
import type { LandingCopy } from '@/lib/landing-copy';

import { Reveal, RevealGroup } from './Reveal';

/**
 * S6 차별점 — 비교우위·반론봉쇄. primary-soft 블록.
 * 데스크톱: 표(Memsum 열 강조). 모바일: 카드 토글(가로 스크롤 금지).
 * Memsum 강조는 색+보더+9닷 마크 중복 신호(색 의존 금지).
 * 카피는 로케일 사전(`copy.compare`)에서 주입.
 */
export function CompareTable({ copy }: { copy: LandingCopy }) {
  const c = copy.compare;
  const bk = copy.isKorean ? 'break-keep' : '';

  return (
    <section
      aria-labelledby="compare-title"
      className="px-5 sm:px-6"
    >
      <div className="mx-auto w-full max-w-5xl rounded-(--radius-block) bg-(--color-primary-soft) px-5 py-16 sm:px-10 sm:py-20">
        <Reveal
          as="h2"
          id="compare-title"
          className={`text-center text-2xl font-bold tracking-tight ${bk} sm:text-4xl`}
        >
          {c.title}
        </Reveal>

        {/* 데스크톱 표 */}
        <div className="mt-12 hidden md:block">
          <table className="w-full overflow-hidden rounded-(--radius-block) border-separate border-spacing-0 bg-(--color-card) shadow-(--shadow-card)">
            <thead>
              <tr>
                <th scope="col" className="w-1/4 p-5 text-left" />
                <th
                  scope="col"
                  className="p-5 text-left text-base font-bold text-(--color-ink-soft)"
                >
                  {c.otherHeader}
                </th>
                <th
                  scope="col"
                  className="border-l-4 border-(--color-accent) bg-(--color-primary)/8 p-5 text-left"
                >
                  <span className="flex items-center gap-2 text-base font-bold text-(--color-primary)">
                    <span className="coral-pulse inline-flex">
                      <DotsLogo size={22} />
                    </span>
                    {c.memsumHeader}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {c.rows.map((row) => (
                <tr key={row.label}>
                  <th
                    scope="row"
                    className={`border-t border-(--color-line) p-5 text-left text-sm font-semibold ${bk} text-(--color-ink)`}
                  >
                    {row.label}
                  </th>
                  <td className={`border-t border-(--color-line) p-5 text-sm leading-relaxed ${bk} text-(--color-ink-soft)`}>
                    {row.other}
                  </td>
                  <td className={`border-l-4 border-t border-(--color-accent) border-t-(--color-line) bg-(--color-primary)/8 p-5 text-sm font-semibold leading-relaxed ${bk} text-(--color-ink)`}>
                    {row.memsum}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 모바일 카드 토글 */}
        <RevealGroup className="mt-10 grid gap-4 md:hidden">
          {c.rows.map((row) => (
            <Reveal
              key={row.label}
              className="overflow-hidden rounded-(--radius-block) bg-(--color-card) shadow-(--shadow-card)"
            >
              <p className={`border-b border-(--color-line) px-5 py-3 text-sm font-bold ${bk}`}>
                {row.label}
              </p>
              <div className="grid grid-cols-2">
                <div className="p-5">
                  <p className="text-xs font-semibold text-(--color-ink-faint)">
                    {c.otherHeader}
                  </p>
                  <p className={`mt-1 text-sm leading-relaxed ${bk} text-(--color-ink-soft)`}>
                    {row.other}
                  </p>
                </div>
                <div className="border-l-4 border-(--color-accent) bg-(--color-primary)/8 p-5">
                  <p className="flex items-center gap-1 text-xs font-semibold text-(--color-primary)">
                    <DotsLogo size={14} />
                    {c.memsumHeader}
                  </p>
                  <p className={`mt-1 text-sm font-semibold leading-relaxed ${bk} text-(--color-ink)`}>
                    {row.memsum}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
