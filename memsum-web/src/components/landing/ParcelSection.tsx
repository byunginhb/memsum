'use client';

import { Bell, Package, Truck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { LandingCopy } from '@/lib/landing-copy';

import { Reveal, RevealGroup } from './Reveal';

/**
 * 택배 추적 기능 섹션 — 한국 한정.
 * LandingPage에서 `copy.isKorean`일 때만 렌더된다.
 * 불릿 3개(캡처→상태→알림)를 Reveal 스태거로 순차 노출.
 * 아이콘 순서는 bullets 배열과 1:1 대응.
 */
const BULLET_ICONS: readonly LucideIcon[] = [Package, Truck, Bell] as const;

export function ParcelSection({ copy }: { copy: LandingCopy }) {
  const c = copy.parcel;

  return (
    <section
      aria-labelledby="parcel-title"
      className="scroll-mt-20 px-5 sm:px-6"
    >
      <div className="mx-auto w-full max-w-6xl rounded-(--radius-block) border border-(--color-line) bg-(--color-card) px-5 py-16 sm:px-10 sm:py-20 shadow-(--shadow-card)">
        {/* 상단 텍스트 */}
        <Reveal
          as="p"
          variant="fade"
          className="text-center text-xs font-semibold uppercase tracking-widest text-(--color-primary)"
        >
          {c.eyebrow}
        </Reveal>

        <Reveal
          as="h2"
          id="parcel-title"
          delay={60}
          className="mt-3 text-center text-2xl font-bold tracking-tight break-keep sm:text-4xl"
        >
          {c.title}
        </Reveal>

        <Reveal
          as="p"
          variant="fade"
          delay={120}
          className="mx-auto mt-4 max-w-xl text-center text-base leading-relaxed break-keep text-(--color-ink-soft)"
        >
          {c.sub}
        </Reveal>

        {/* 지원 택배사 */}
        <Reveal
          variant="fade"
          delay={180}
          className="mt-4 text-center text-sm text-(--color-ink-soft)"
        >
          {c.carriers}
        </Reveal>

        {/* 불릿 카드 3개 */}
        <RevealGroup className="mt-12 grid gap-6 sm:grid-cols-3">
          {c.bullets.map((bullet, index) => {
            const Icon = BULLET_ICONS[index];
            return (
              <Reveal
                key={bullet.title}
                className="flex flex-col gap-4 rounded-(--radius-block) border border-(--color-line) bg-(--color-cream) p-6 shadow-(--shadow-card)"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-(--color-primary-soft) text-(--color-primary)">
                  <Icon size={24} aria-hidden="true" />
                </span>
                <h3 className="text-base font-bold tracking-tight break-keep">
                  {bullet.title}
                </h3>
                <p className="text-sm leading-relaxed break-keep text-(--color-ink-soft)">
                  {bullet.body}
                </p>
              </Reveal>
            );
          })}
        </RevealGroup>

        {/* 정직 고지 */}
        <Reveal
          as="p"
          variant="fade"
          delay={80}
          className="mt-8 text-center text-xs leading-relaxed text-(--color-ink-soft)"
        >
          {c.disclaimer}
        </Reveal>
      </div>
    </section>
  );
}
