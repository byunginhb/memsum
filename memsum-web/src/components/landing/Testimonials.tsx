import { RevealText } from '@/components/brand/RevealText';
import type { LandingCopy } from '@/lib/landing-copy';

/**
 * 미스 방지 서사 — 세 단을 세로 머리카락 선으로 나눈다.
 * 실제 후기가 아닌 항목(isExample)은 "경험 예시" 꼬리표를 반드시 보인다(허위 후기 정책).
 */
export function Testimonials({ copy }: { copy: LandingCopy }) {
  const c = copy.testimonials;

  return (
    <section aria-labelledby="testimonials-title" className="surface-soft">
      <div className="wrap py-24 sm:py-32">
        <h2 id="testimonials-title" data-rv="title" className="t-title max-w-3xl text-[clamp(1.875rem,4.4vw,3rem)]">
          <RevealText text={c.title} />
        </h2>
        {/* 세 단을 한 칸씩 내려 계단처럼 — 같은 틀이 반복되는 정지 화면 느낌을 덜어낸다. */}
        <ul data-rv="stagger" className="mt-12 grid border-t-2 border-ink md:grid-cols-3 md:items-start">
          {c.items.map((item, i) => (
            <li
              key={item.context}
              className={`flex flex-col border-b border-rule py-8 md:border-b-0 md:border-l md:px-8 md:py-10 md:first:border-l-0 md:first:pl-0 ${
                ['', 'md:mt-10', 'md:mt-20'][i] ?? ''
              }`}
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
