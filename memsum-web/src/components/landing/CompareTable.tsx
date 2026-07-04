'use client';

import { CheckCircle2, Star } from 'lucide-react';

import { DotsLogo } from '@/components/DotsLogo';
import type { LandingCopy } from '@/lib/landing-copy';

import { Reveal, RevealGroup } from './Reveal';

/**
 * S6 차별점 — 비교우위·반론봉쇄.
 * "영수증 카드" 2장(다른 도구 / Memsum)을 나란히 배치.
 * 모바일에서는 세로 스택. Memsum 카드에 체크 아이콘 + accent 스타 배지.
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
      <div className="mx-auto w-full max-w-5xl rounded-(--radius-block) bg-(--color-cream) px-5 py-16 sm:px-10 sm:py-20">
        <Reveal
          as="h2"
          id="compare-title"
          className={`text-center text-2xl font-bold tracking-tight text-(--color-ink) ${bk} sm:text-4xl`}
        >
          {c.title}
        </Reveal>

        {/* 두 장의 영수증 카드 — 모바일 세로 스택 / sm 이상 좌우 나란히 */}
        <RevealGroup className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">

          {/* LEFT: 다른 도구 — 음소거 카드 */}
          <Reveal className="overflow-hidden rounded-(--radius-block) bg-(--color-primary-soft)">
            <div className="border-b border-(--color-line) px-6 py-4">
              <p className={`text-base font-bold text-(--color-ink-soft) ${bk}`}>
                {c.otherHeader}
              </p>
            </div>
            <div className="divide-y divide-(--color-line)">
              {c.rows.map((row) => (
                <div key={row.label} className="px-6 py-4">
                  <p className={`font-mono text-xs text-(--color-ink-faint) ${bk}`}>
                    {row.label}
                  </p>
                  <p className={`mt-1 text-sm leading-relaxed text-(--color-ink-soft) ${bk}`}>
                    {row.other}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>

          {/* RIGHT: Memsum — 강조 카드 */}
          <Reveal className="overflow-hidden rounded-(--radius-block) border border-(--color-primary)/30 bg-(--color-card) shadow-(--shadow-card)">
            <div className="flex items-center justify-between bg-(--color-primary) px-6 py-4">
              <span className={`flex items-center gap-2 text-base font-bold text-white ${bk}`}>
                <DotsLogo size={20} />
                {c.memsumHeader}
              </span>
              <Star
                className="size-4 shrink-0 fill-(--color-accent) text-(--color-accent)"
                aria-hidden
              />
            </div>
            <div className="divide-y divide-(--color-line)">
              {c.rows.map((row) => (
                <div key={row.label} className="px-6 py-4">
                  <p className={`font-mono text-xs text-(--color-ink-faint) ${bk}`}>
                    {row.label}
                  </p>
                  <div className="mt-1 flex items-start gap-2">
                    <CheckCircle2
                      className="mt-0.5 size-4 shrink-0 text-(--color-primary)"
                      aria-hidden
                    />
                    <p className={`text-sm font-semibold leading-relaxed text-(--color-ink) ${bk}`}>
                      {row.memsum}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>

        </RevealGroup>
      </div>
    </section>
  );
}
