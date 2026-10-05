import { RevealText } from '@/components/brand/RevealText';
import type { LandingCopy } from '@/lib/landing-copy';

/**
 * 대상 — "이런 분" 목록을 큰 글자 구분선 목록으로. 각 줄 앞에는 작은 크롭 모서리(브랜드 장치)를 둔다.
 * 오른쪽은 한 문장 인용으로 마무리.
 */
export function AudienceSection({ copy }: { copy: LandingCopy }) {
  const c = copy.audience;

  return (
    <section aria-labelledby="audience-title" className="wrap pt-16 pb-24 sm:pt-20 sm:pb-32">
      <h2 id="audience-title" data-rv="title" className="t-title max-w-3xl text-[clamp(1.875rem,4.4vw,3rem)]">
        <RevealText text={c.title} />
      </h2>

      <div className="mt-12 grid gap-14 lg:grid-cols-12 lg:gap-10">
        <ul data-rv="stagger" className="border-t-2 border-ink lg:col-span-7">
          {c.items.map((item) => (
            <li
              key={item}
              className="flex gap-4 border-b border-rule py-5 text-[clamp(1.0625rem,1.8vw,1.25rem)] leading-[1.5] font-semibold tracking-[-0.015em]"
            >
              <span aria-hidden="true" className="mt-[0.45em] size-3 shrink-0 border-t-2 border-l-2 border-cobalt" />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <figure data-rv="" className="lg:col-span-4 lg:col-start-9 lg:self-end [--rv-d:360ms]">
          <p className="t-title text-[clamp(1.5rem,3vw,2.125rem)]">{c.quoteHeadline}</p>
          <p className="mt-5 text-[17px] leading-[1.7] text-ink-2">{c.quoteSub}</p>
        </figure>
      </div>
    </section>
  );
}
