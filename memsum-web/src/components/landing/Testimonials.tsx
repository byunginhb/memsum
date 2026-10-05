import type { LandingCopy } from '@/lib/landing-copy';

/**
 * 미스 방지 서사 — 세 단을 세로 머리카락 선으로 나눈다.
 * 실제 후기가 아닌 항목(isExample)은 "경험 예시" 꼬리표를 반드시 보인다(허위 후기 정책).
 */
export function Testimonials({ copy }: { copy: LandingCopy }) {
  const c = copy.testimonials;

  return (
    <section aria-labelledby="testimonials-title" className="border-y border-rule bg-surface">
      <div className="wrap py-20 sm:py-24">
        <h2 id="testimonials-title" className="t-title max-w-3xl text-[clamp(1.875rem,4.4vw,3rem)]">
          {c.title}
        </h2>
        <ul className="mt-12 grid border-t-2 border-ink md:grid-cols-3">
          {c.items.map((item) => (
            <li
              key={item.context}
              className="flex flex-col border-b border-rule py-8 md:border-b-0 md:border-l md:px-8 md:py-10 md:first:border-l-0 md:first:pl-0"
            >
              {item.isExample ? (
                <span className="self-start rounded-[4px] border border-rule-strong px-2 py-0.5 text-[12px] font-semibold text-ink-2">
                  {c.exampleBadge}
                </span>
              ) : null}
              <blockquote className="mt-5 flex-1">
                <p className="text-[18px] leading-[1.6] font-semibold tracking-[-0.015em]">{item.quote}</p>
              </blockquote>
              <p className="t-eyebrow mt-6">{item.context}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
