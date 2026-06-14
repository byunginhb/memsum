import Image from 'next/image';
import { ChevronDown } from 'lucide-react';

import { SITE_NAME } from '@/lib/site';

import { AnimatedDotsLogo } from './AnimatedDotsLogo';
import { Reveal } from './Reveal';
import { StoreBadge } from './StoreBadge';

/**
 * S1 Hero — 후킹·즉시 설치 욕구·스크롤 유도.
 * 텍스트는 SSR(LCP 보호), 모션은 Reveal/AnimatedDotsLogo가 마운트 후 트리거.
 * 카피는 02 §1 원문 그대로.
 */
export function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="relative overflow-hidden"
    >
      {/* 배경 글로우 blob — Hero·FinalCta에만, 과용 금지 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-(--color-primary)/18 blur-[80px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-(--color-accent)/12 blur-[80px]"
      />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-5 pt-12 pb-20 sm:px-6 lg:grid-cols-12 lg:gap-8 lg:pt-20 lg:pb-28">
        {/* 좌측 텍스트 7/12 */}
        <div className="text-center lg:col-span-7 lg:text-left">
          <Reveal
            as="p"
            delay={0}
            className="inline-flex items-center gap-2 rounded-full bg-(--color-primary-soft) px-4 py-1.5 text-xs font-bold tracking-wide text-(--color-primary)"
          >
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-(--color-accent)"
            />
            스크린샷 정리 · 캘린더 자동 · 주간 요약
          </Reveal>

          <h1
            id="hero-title"
            className="mt-6 font-extrabold tracking-tight break-keep"
            style={{
              fontSize: 'clamp(2.125rem, 6vw, 3.75rem)',
              lineHeight: 1.12,
              letterSpacing: '-0.03em',
            }}
          >
            <Reveal as="span" delay={90} className="block">
              찍기만 하세요.
            </Reveal>
            <Reveal as="span" delay={180} className="block">
              {SITE_NAME}이 알아서.
              {/* 라인2 끝 코랄 점 — 브랜드 9닷 코랄 메타포 */}
              <span
                aria-hidden="true"
                className="ml-1 inline-block h-2 w-2 rounded-full bg-(--color-accent) align-baseline"
              />
            </Reveal>
          </h1>

          <Reveal
            as="p"
            delay={300}
            className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed break-keep text-(--color-ink-soft) lg:mx-0 lg:text-xl"
          >
            사진첩에 쌓이기만 하던 스크린샷, 이제 다시 쓸모 있게.
            <br />
            {SITE_NAME}이 캡처 속 글자를 읽어 정리하고, 일정은 캘린더에 넣고, 한
            주는 5줄로 돌려드려요.
          </Reveal>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap lg:justify-start">
            <Reveal variant="scale-in" delay={420}>
              <StoreBadge store="appstore" />
            </Reveal>
            <Reveal variant="scale-in" delay={480}>
              <StoreBadge store="googleplay" />
            </Reveal>
          </div>

          <Reveal
            as="p"
            variant="fade"
            delay={560}
            className="mt-5 text-sm break-keep text-(--color-ink-faint)"
          >
            지금 무료로 이용해보세요
          </Reveal>
        </div>

        {/* 우측 폰 목업 5/12 */}
        <div className="lg:col-span-5">
          <div className="relative mx-auto flex max-w-md justify-center">
            <Reveal
              variant="fade-up"
              delay={440}
              className="relative z-0 mt-10 w-[42%] max-w-[180px] -rotate-6 sm:w-[44%]"
            >
              <div className="overflow-hidden rounded-3xl border border-(--color-line) bg-(--color-card) shadow-(--shadow-float)">
                <Image
                  src="/shots/report.png"
                  alt="Memsum 주간 리포트 화면 — 이번 주 핵심 5개를 5줄로 보여주는 모습"
                  width={1080}
                  height={2400}
                  sizes="(max-width: 768px) 35vw, 18vw"
                />
              </div>
            </Reveal>
            <Reveal
              variant="fade-up"
              delay={360}
              className="relative z-10 -ml-6 w-[48%] max-w-[210px] rotate-2 sm:w-[50%]"
            >
              <div className="overflow-hidden rounded-3xl border border-(--color-line) bg-(--color-card) shadow-(--shadow-float)">
                <Image
                  src="/shots/home.png"
                  alt="Memsum 홈 화면 — 이번 주 캡처가 카드로 자동 정리된 모습"
                  width={1080}
                  height={2400}
                  sizes="(max-width: 768px) 45vw, 22vw"
                  priority
                />
              </div>
            </Reveal>
            {/* 9닷 시그니처 마크 — 폰 위에 부유 */}
            <div className="absolute -right-2 top-2 z-20 hidden sm:block">
              <AnimatedDotsLogo size={56} trigger="load" />
            </div>
          </div>
        </div>
      </div>

      {/* 스크롤 힌트 — S3로 스무스 스크롤 */}
      <div className="relative flex justify-center pb-8">
        <a
          href="#how-it-works"
          className="flex flex-col items-center gap-1.5 text-sm text-(--color-ink-soft) transition-colors hover:text-(--color-ink)"
        >
          <span className="break-keep">이렇게 작동해요</span>
          <ChevronDown
            size={20}
            aria-hidden="true"
            className="hint-bounce text-(--color-primary)"
          />
        </a>
      </div>
    </section>
  );
}
