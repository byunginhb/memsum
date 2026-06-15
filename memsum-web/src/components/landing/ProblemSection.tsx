import type { LandingCopy } from '@/lib/landing-copy';

import { CountUp } from './CountUp';
import { Reveal } from './Reveal';

/**
 * S2 문제 공감 — "이거 내 얘기다" 몰입.
 * 카운터(1,847장)·인용구·코랄 밑줄 강조. 카피는 로케일 사전(`copy.problem`)에서 주입.
 */
export function ProblemSection({ copy }: { copy: LandingCopy }) {
  const c = copy.problem;
  const bk = copy.isKorean ? 'break-keep' : '';

  return (
    <section
      aria-labelledby="problem-title"
      className="mx-auto w-full max-w-5xl px-5 py-20 sm:px-6 sm:py-24"
    >
      <Reveal
        as="h2"
        id="problem-title"
        className={`text-center text-2xl font-bold tracking-tight ${bk} sm:text-4xl`}
      >
        {c.title}
      </Reveal>

      <Reveal
        as="p"
        delay={80}
        className={`mx-auto mt-5 max-w-2xl text-center text-base leading-relaxed ${bk} text-(--color-ink-soft) sm:text-lg`}
      >
        {c.bodyLine1}
        <br />
        {c.bodyLine2}
      </Reveal>

      {/* 카운터 강조 블록 — 1,847은 "이런 경우도 있다"는 예시 수치(문제 제기 장치). */}
      <Reveal
        variant="scale-in"
        delay={120}
        className="mx-auto mt-12 max-w-md rounded-(--radius-block) border border-(--color-line) bg-(--color-card) p-8 text-center shadow-(--shadow-card)"
      >
        <p className={`text-sm font-medium ${bk} text-(--color-ink-soft)`}>
          {c.counterIntro}
        </p>
        <p className="mt-2 flex items-baseline justify-center gap-1">
          <CountUp
            to={1847}
            className="text-6xl font-extrabold tracking-tight text-(--color-primary) sm:text-7xl"
          />
          <span className="text-3xl font-bold text-(--color-ink) sm:text-4xl">
            {c.counterUnit}
          </span>
        </p>
        <p className={`mt-2 text-sm ${bk} text-(--color-ink-faint)`}>
          {c.counterClosing}
        </p>
      </Reveal>

      <Reveal
        variant="blur-in"
        delay={200}
        className="mx-auto mt-14 max-w-2xl"
      >
        <blockquote className="border-l-4 border-(--color-accent) pl-5">
          <p className={`text-xl font-bold tracking-tight ${bk} sm:text-2xl`}>
            {c.quote}
          </p>
          <p className={`mt-3 text-base leading-relaxed ${bk} text-(--color-ink-soft)`}>
            {c.underQuote}
          </p>
        </blockquote>
      </Reveal>

      <Reveal
        as="p"
        delay={80}
        className={`mx-auto mt-10 max-w-2xl text-center text-base leading-relaxed ${bk} text-(--color-ink-soft) sm:text-lg`}
      >
        {c.leadIn}
      </Reveal>

      <Reveal
        delay={120}
        className="mx-auto mt-6 max-w-2xl text-center"
      >
        <p className={`text-lg font-bold tracking-tight ${bk} sm:text-xl`}>
          <span className="coral-underline">{c.coralUnderline}</span>
        </p>
      </Reveal>
    </section>
  );
}
