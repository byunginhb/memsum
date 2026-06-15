'use client';

import Image from 'next/image';
import {
  CalendarPlus,
  Mail,
  ScanText,
  ShieldCheck,
  Tags,
  type LucideIcon,
} from 'lucide-react';

import { useActiveSection } from '@/hooks/use-active-section';
import type { LandingCopy } from '@/lib/landing-copy';

import { Reveal } from './Reveal';

/**
 * 기능 카드의 시각 메타(아이콘·강조). 언어 비의존이라 카피와 분리해 인덱스로 매핑한다.
 * 순서는 `copy.features.items`와 1:1 대응(읽기→분류→캘린더→주간→안전).
 */
const FEATURE_META: readonly { Icon: LucideIcon; accent?: boolean }[] = [
  { Icon: ScanText },
  { Icon: Tags },
  { Icon: CalendarPlus },
  { Icon: Mail },
  { Icon: ShieldCheck, accent: true },
] as const;

/**
 * S4 기능 — 욕구 구체화.
 * 데스크톱(≥1024px): 좌측 스티키 폰 목업 + 우측 5블록 세로 스크롤(active 동기화).
 *   활성 기능에 따라 폰 위 하이라이트 오버레이(색 틴트 + 아이콘 + 라벨)가 crossfade된다.
 * 모바일/태블릿: 스티키 해제 → 카드 스택 폴백.
 * 02 §4에는 섹션 헤딩이 없어 H2를 두지 않는다(카피 변경 금지). 접근성 이름은 aria-label로 보강.
 */
export function FeatureShowcase({ copy }: { copy: LandingCopy }) {
  const c = copy.features;
  const bk = copy.isKorean ? 'break-keep' : '';
  const { setRef, active } = useActiveSection(c.items.length);

  return (
    <section
      aria-label={c.sectionAria}
      className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-6 sm:py-24"
    >
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
        {/* 좌측 스티키 폰 (데스크톱만) */}
        <div className="hidden lg:col-span-5 lg:block">
          <div className="sticky top-28">
            <div className="relative mx-auto max-w-[260px]">
              <div className="relative overflow-hidden rounded-3xl border border-(--color-line) bg-(--color-card) shadow-(--shadow-float)">
                <Image
                  src={copy.shots.home}
                  alt={c.phoneAlt}
                  width={1080}
                  height={2400}
                  sizes="22vw"
                />
                {/* 활성 기능별 색 틴트 — 폰 화면 위에서 crossfade */}
                {c.items.map((feature, index) => (
                  <span
                    key={feature.title}
                    aria-hidden="true"
                    data-active={active === index ? 'true' : 'false'}
                    className={`feature-overlay pointer-events-none absolute inset-0 mix-blend-multiply ${
                      FEATURE_META[index].accent
                        ? 'bg-(--color-accent)/15'
                        : 'bg-(--color-primary)/15'
                    }`}
                  />
                ))}
              </div>
              {/* 활성 기능 라벨 칩 — 모든 레이어를 겹쳐 opacity 교차(실제 crossfade) */}
              <div className="pointer-events-none absolute inset-x-4 bottom-4">
                <div className="relative">
                  {c.items.map((feature, index) => {
                    const meta = FEATURE_META[index];
                    const Icon = meta.Icon;
                    return (
                      <div
                        key={feature.title}
                        data-active={active === index ? 'true' : 'false'}
                        className={`feature-overlay flex items-center gap-2 rounded-2xl bg-(--color-card)/95 px-4 py-3 shadow-(--shadow-card) backdrop-blur-sm ${
                          index === 0 ? 'relative' : 'absolute inset-0'
                        }`}
                      >
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                            meta.accent
                              ? 'bg-(--color-accent-soft) text-(--color-accent)'
                              : 'bg-(--color-primary-soft) text-(--color-primary)'
                          }`}
                        >
                          <Icon size={18} aria-hidden="true" />
                        </span>
                        <span className={`text-sm font-semibold tracking-tight ${bk}`}>
                          {feature.title}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 우측 기능 블록 */}
        <div className="grid gap-6 lg:col-span-7 sm:grid-cols-2 lg:grid-cols-1">
          {c.items.map((feature, index) => {
            const meta = FEATURE_META[index];
            const Icon = meta.Icon;
            return (
              <article
                key={feature.title}
                ref={setRef(index)}
                className="group rounded-(--radius-block) border border-(--color-line) bg-(--color-card) p-7 shadow-(--shadow-card) transition-all duration-200 ease-(--ease-standard) hover:-translate-y-1 hover:shadow-(--shadow-float)"
              >
                <Reveal variant="scale-in">
                  <span
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                      meta.accent
                        ? 'bg-(--color-accent-soft) text-(--color-accent)'
                        : 'bg-(--color-primary-soft) text-(--color-primary)'
                    }`}
                  >
                    <Icon size={24} aria-hidden="true" />
                  </span>
                </Reveal>
                <Reveal as="h3" delay={80} className={`mt-4 text-lg font-bold tracking-tight ${bk}`}>
                  {feature.title}
                </Reveal>
                <Reveal
                  as="p"
                  variant="fade"
                  delay={160}
                  className={`mt-2 text-base leading-relaxed ${bk} text-(--color-ink-soft)`}
                >
                  {feature.body}
                </Reveal>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
