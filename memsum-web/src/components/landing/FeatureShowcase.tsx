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

import { Reveal } from './Reveal';

type Feature = {
  title: string;
  body: string;
  Icon: LucideIcon;
  accent?: boolean;
};

/** 02 §4 원문 5블록. 카피의 이모지는 lucide-react 아이콘으로 전부 치환. */
const FEATURES: readonly Feature[] = [
  {
    title: '캡처 속 글자를 읽어요',
    body: '이미지 안의 한국어·영어 텍스트를 추출해 검색 가능한 내용으로 바꿔요. 오타와 줄바꿈까지 다듬어 읽기 좋게 정리합니다.',
    Icon: ScanText,
  },
  {
    title: '제목·요약·분류를 자동으로',
    body: '캡처마다 한 줄 제목과 한 줄 요약을 붙여요. 마케팅·일정·영수증·쇼핑·정보·기타 6가지로 자동 분류해 나중에 찾기 쉽게.',
    Icon: Tags,
  },
  {
    title: '일정은 한 번의 탭으로 캘린더에',
    body: '날짜·시간이 담긴 캡처에서 일정을 찾아내요. 원할 때 한 번의 탭이면 구글 캘린더에 추가. 옮겨 적다 약속 까먹는 일, 이제 끝.',
    Icon: CalendarPlus,
  },
  {
    title: '일요일 저녁, 이번 주 5줄',
    body: '한 주에 모인 캡처 중 다시 볼 만한 5개를 골라 5줄로 보여드려요. 한 주에 무엇을 담아뒀는지 짧게 돌아볼 수 있어요.',
    Icon: Mail,
  },
  {
    title: '가입 없이, 광고 없이',
    body: '이메일이나 계정 가입 없이 익명으로 바로 시작해요. 구글 캘린더 연결 정보는 기기 안에만 안전하게 보관하고, 캘린더 전체를 읽지 않아요. 광고도 없습니다.',
    Icon: ShieldCheck,
    accent: true,
  },
] as const;

/**
 * S4 기능 — 욕구 구체화.
 * 데스크톱(≥1024px): 좌측 스티키 폰 목업 + 우측 5블록 세로 스크롤(active 동기화).
 *   활성 기능에 따라 폰 위 하이라이트 오버레이(색 틴트 + 아이콘 + 라벨)가 crossfade된다.
 *   crossfade는 key 토글이 아니라 모든 레이어를 겹쳐두고 active 레이어만 opacity:1로 만드는 방식
 *   (이전 레이어 fade-out + 새 레이어 fade-in, 220ms). 대표 화면 이미지가 없어 오버레이로 표현.
 * 모바일/태블릿: 스티키 해제 → 카드 스택 폴백.
 * 02 §4에는 섹션 헤딩이 없어 H2를 두지 않는다(카피 변경 금지). 접근성 이름은 aria-label로 보강.
 */
export function FeatureShowcase() {
  const { setRef, active } = useActiveSection(FEATURES.length);

  return (
    <section
      aria-label="Memsum 기능"
      className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-6 sm:py-24"
    >
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
        {/* 좌측 스티키 폰 (데스크톱만) */}
        <div className="hidden lg:col-span-5 lg:block">
          <div className="sticky top-28">
            <div className="relative mx-auto max-w-[260px]">
              <div className="relative overflow-hidden rounded-3xl border border-(--color-line) bg-(--color-card) shadow-(--shadow-float)">
                <Image
                  src="/shots/home.png"
                  alt="Memsum 앱 화면 — 캡처가 제목·요약과 함께 자동 정리된 모습"
                  width={1080}
                  height={2400}
                  sizes="22vw"
                />
                {/* 활성 기능별 색 틴트 — 폰 화면 위에서 crossfade */}
                {FEATURES.map((feature, index) => (
                  <span
                    key={feature.title}
                    aria-hidden="true"
                    data-active={active === index ? 'true' : 'false'}
                    className={`feature-overlay pointer-events-none absolute inset-0 mix-blend-multiply ${
                      feature.accent
                        ? 'bg-(--color-accent)/15'
                        : 'bg-(--color-primary)/15'
                    }`}
                  />
                ))}
              </div>
              {/* 활성 기능 라벨 칩 — 모든 레이어를 겹쳐 opacity 교차(실제 crossfade) */}
              <div className="pointer-events-none absolute inset-x-4 bottom-4">
                <div className="relative">
                  {FEATURES.map((feature, index) => {
                    const Icon = feature.Icon;
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
                            feature.accent
                              ? 'bg-(--color-accent-soft) text-(--color-accent)'
                              : 'bg-(--color-primary-soft) text-(--color-primary)'
                          }`}
                        >
                          <Icon size={18} aria-hidden="true" />
                        </span>
                        <span className="text-sm font-semibold tracking-tight break-keep">
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
          {FEATURES.map((feature, index) => (
            <article
              key={feature.title}
              ref={setRef(index)}
              className="group rounded-(--radius-block) border border-(--color-line) bg-(--color-card) p-7 shadow-(--shadow-card) transition-all duration-200 ease-(--ease-standard) hover:-translate-y-1 hover:shadow-(--shadow-float)"
            >
              <Reveal variant="scale-in">
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                    feature.accent
                      ? 'bg-(--color-accent-soft) text-(--color-accent)'
                      : 'bg-(--color-primary-soft) text-(--color-primary)'
                  }`}
                >
                  <feature.Icon size={24} aria-hidden="true" />
                </span>
              </Reveal>
              <Reveal as="h3" delay={80} className="mt-4 text-lg font-bold tracking-tight break-keep">
                {feature.title}
              </Reveal>
              <Reveal
                as="p"
                variant="fade"
                delay={160}
                className="mt-2 text-base leading-relaxed break-keep text-(--color-ink-soft)"
              >
                {feature.body}
              </Reveal>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
