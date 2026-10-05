import type { LandingCopy } from '@/lib/landing-copy';

import { CountUp } from './CountUp';

/** 예시 페르소나의 스크린샷 수(문제 제기 장치). */
const EXAMPLE_SCREENSHOTS = 1847;

/**
 * 문제 공감 — 큰 숫자 하나와 인용 하나로 "내 얘기"를 만든다.
 * 왼쪽 질문 / 오른쪽 영수증처럼 구분선 사이에 찍힌 숫자. 장식 없이 타이포와 구분선만.
 */
export function ProblemSection({ copy }: { copy: LandingCopy }) {
  const c = copy.problem;

  return (
    <section aria-labelledby="problem-title" className="wrap py-20 sm:py-24">
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-5">
          <h2 id="problem-title" className="t-title text-[clamp(1.875rem,4.4vw,3rem)]">
            {c.title}
          </h2>
          <p className="mt-6 max-w-md text-[17px] leading-[1.7] text-ink-2">
            {c.bodyLine1}
            <br />
            {c.bodyLine2}
          </p>
        </div>

        <div className="lg:col-span-7">
          <p className="t-eyebrow">{c.counterIntro}</p>
          <p className="mt-3 flex items-baseline gap-2 border-y border-ink py-5 sm:gap-3">
            <CountUp
              to={EXAMPLE_SCREENSHOTS}
              className="t-mono text-[clamp(4.5rem,17vw,10.5rem)] leading-[0.9] font-medium tracking-[-0.06em]"
            />
            <span className="text-[clamp(1.5rem,4vw,2.5rem)] font-black tracking-[-0.03em]">
              {c.counterUnit}
            </span>
          </p>
          <p className="mt-4 text-[15px] text-ink-2">{c.counterClosing}</p>
        </div>
      </div>

      <div className="mt-20 grid gap-6 border-t border-rule pt-10 lg:grid-cols-12 lg:gap-10">
        <blockquote className="lg:col-span-7">
          <p className="t-title text-[clamp(1.625rem,3.6vw,2.5rem)]">{c.quote}</p>
        </blockquote>
        <p className="text-[17px] leading-[1.7] text-ink-2 lg:col-span-5 lg:pt-2">{c.underQuote}</p>
      </div>

      <div className="mt-16 max-w-3xl">
        <p className="text-[17px] leading-[1.7] text-ink-2">{c.leadIn}</p>
        <p className="mt-3 text-[clamp(1.25rem,2.6vw,1.75rem)] leading-[1.45] font-bold tracking-[-0.02em]">
          <span className="underline decoration-cobalt decoration-[3px] underline-offset-[8px]">
            {c.coralUnderline}
          </span>
        </p>
      </div>
    </section>
  );
}
