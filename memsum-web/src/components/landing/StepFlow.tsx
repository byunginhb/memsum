import type { LandingCopy } from '@/lib/landing-copy';

/**
 * 작동 순서 — 실제로 순서가 있는 단계라 01·02·03 번호를 쓴다(구조 장치는 의미 있을 때만).
 * 세 단은 카드 없이 머리카락 세로 구분선으로만 나눈다. 모바일에선 가로 구분선으로 쌓인다.
 */
export function StepFlow({ copy }: { copy: LandingCopy }) {
  const c = copy.steps;

  return (
    <section id="how-it-works" aria-labelledby="steps-title" className="wrap py-20 sm:py-24">
      <h2 id="steps-title" className="t-title text-[clamp(1.875rem,4.4vw,3rem)]">
        {c.title}
      </h2>
      <ol className="mt-12 grid border-t-2 border-ink md:grid-cols-3">
        {c.items.map((step, i) => (
          <li
            key={step.title}
            className="border-b border-rule py-8 md:border-b-0 md:border-l md:px-8 md:py-10 md:first:border-l-0 md:first:pl-0"
          >
            <span className="t-mono block text-[13px] text-cobalt">
              {String(i + 1).padStart(2, '0')}
            </span>
            <h3 className="mt-6 text-[clamp(1.375rem,2.4vw,1.75rem)] leading-[1.25] font-black tracking-[-0.03em]">
              {step.title}
            </h3>
            <p className="mt-3 text-[16px] leading-[1.7] text-ink-2">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
