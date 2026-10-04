import type { LandingCopy } from '@/lib/landing-copy';

import { Reveal, RevealGroup } from './Reveal';

/**
 * S3 작동 방식 — 컨셉 "Scan": 3열 패널 대신 가로 타임라인.
 * 페이지(Quartz) 위에 얇은 상단선이 지나고, 각 스텝이 그 선에서 아래로 걸린다.
 * 각 카드 뒤에는 Syne 초대형 고스트 숫자(01/02/03)가 은은히 깔린다.
 * 카피는 로케일 사전(`copy.steps`)에서 주입.
 */
export function StepFlow({ copy }: { copy: LandingCopy }) {
  const c = copy.steps;
  const bk = copy.isKorean ? 'break-keep' : '';

  return (
    <section
      id="how-it-works"
      aria-labelledby="step-title"
      className="scroll-mt-20 px-5 py-20 sm:px-6 sm:py-24"
    >
      <div className="mx-auto w-full max-w-6xl">
        <Reveal
          as="h2"
          id="step-title"
          className={`text-2xl font-bold tracking-tight ${bk} sm:text-4xl`}
        >
          {c.title}
        </Reveal>

        {/* 가로 타임라인 — 상단 얇은 선에서 스텝이 아래로 걸린다 */}
        <RevealGroup className="relative mt-14 grid gap-10 border-t border-(--color-line) md:grid-cols-3 md:gap-6">
          {c.items.map((step, index) => (
            <Reveal key={step.title} className="relative pt-8">
              {/* 초대형 고스트 숫자 — Syne, 카드 뒤 은은히 */}
              <span
                aria-hidden="true"
                className="font-display pointer-events-none absolute -top-1 right-1 select-none text-[6.5rem] font-extrabold leading-none"
                style={{
                  color:
                    'color-mix(in srgb, var(--color-primary) 8%, transparent)',
                }}
              >
                0{index + 1}
              </span>
              {/* 타임라인 위 라벤더 틱 */}
              <span
                aria-hidden="true"
                className="absolute -top-[5px] left-0 h-2.5 w-2.5 rounded-full bg-(--color-primary)"
              />
              <p className="font-mono text-[11px] font-semibold tracking-[0.2em] text-(--color-ink-faint)">
                STEP 0{index + 1}
              </p>
              <h3 className={`relative mt-2 text-lg font-bold tracking-tight ${bk}`}>
                {step.title}
              </h3>
              <p className={`relative mt-2 text-sm leading-relaxed ${bk} text-(--color-ink-soft)`}>
                {step.body}
              </p>
            </Reveal>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
