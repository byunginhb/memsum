import { Quote } from 'lucide-react';

import type { LandingCopy } from '@/lib/landing-copy';

import { Reveal, RevealGroup } from './Reveal';

/**
 * 미스방지 서사 후기 섹션.
 * "정리 자랑"이 아닌 "놓칠 뻔한 걸 막았다" 톤의 경험 예시 카드 3장.
 * 실제 후기 미확보 구간이므로 각 카드에 "경험 예시" 배지를 노출한다(허위 후기 0).
 * 실제 사용자 후기 확보 후 isExample:false 항목으로 교체·혼용할 수 있다.
 */
export function Testimonials({ copy }: { copy: LandingCopy }) {
  const c = copy.testimonials;
  const bk = copy.isKorean ? 'break-keep' : '';

  return (
    <section aria-labelledby="testimonials-title" className="px-5 sm:px-6">
      <div className="mx-auto w-full max-w-5xl">
        <Reveal
          as="h2"
          id="testimonials-title"
          className={`text-center text-2xl font-bold tracking-tight ${bk} sm:text-4xl`}
        >
          {c.title}
        </Reveal>

        <RevealGroup stagger={80} className="mt-10 grid gap-5 sm:grid-cols-3">
          {c.items.map((item) => (
            <Reveal
              key={item.quote}
              className="flex flex-col rounded-(--radius-block) border border-(--color-line) bg-(--color-card) p-6 shadow-(--shadow-card)"
            >
              <Quote
                size={20}
                aria-hidden="true"
                className="mb-3 shrink-0 text-(--color-primary)"
              />
              <p className={`flex-1 text-base leading-relaxed ${bk} text-(--color-ink)`}>
                {item.quote}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {item.isExample && (
                  <span className="inline-block rounded-full border border-(--color-line) px-2.5 py-0.5 text-xs font-medium text-(--color-ink-soft)">
                    {c.exampleBadge}
                  </span>
                )}
                <span className={`text-xs text-(--color-ink-faint) ${bk}`}>
                  {item.context}
                </span>
              </div>
            </Reveal>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
