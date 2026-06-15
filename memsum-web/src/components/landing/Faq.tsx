import { ChevronDown } from 'lucide-react';

import type { LandingCopy } from '@/lib/landing-copy';

import { Reveal, RevealGroup } from './Reveal';

/**
 * S7 FAQ — 마지막 불안 제거.
 * <details>/<summary> 네이티브 아코디언(JS 없이 동작·SSR·키보드 무료) + CSS 높이 트랜지션.
 * 첫 항목만 기본 열림. 카피는 로케일 사전(`copy.faq`)에서 주입.
 */
export function Faq({ copy }: { copy: LandingCopy }) {
  const c = copy.faq;
  const bk = copy.isKorean ? 'break-keep' : '';

  return (
    <section
      aria-labelledby="faq-title"
      className="mx-auto w-full max-w-3xl px-5 py-20 sm:px-6 sm:py-24"
    >
      <Reveal
        as="h2"
        id="faq-title"
        className={`text-center text-2xl font-bold tracking-tight ${bk} sm:text-4xl`}
      >
        {c.title}
      </Reveal>

      <RevealGroup stagger={60} className="mt-10 grid gap-3">
        {c.items.map((item, index) => (
          <Reveal key={item.q}>
            <details
              className="faq-item rounded-(--radius-block) border border-(--color-line) bg-(--color-card) shadow-(--shadow-card)"
              open={index === 0}
            >
              <summary className={`flex items-center justify-between gap-4 px-6 py-5 text-left text-base font-bold tracking-tight ${bk} sm:text-lg`}>
                <span>{item.q}</span>
                <ChevronDown
                  size={20}
                  aria-hidden="true"
                  className="faq-chevron shrink-0 text-(--color-primary)"
                />
              </summary>
              <div className="faq-answer">
                <div>
                  <p className={`px-6 pb-5 text-base leading-relaxed ${bk} text-(--color-ink-soft)`}>
                    {item.a}
                  </p>
                </div>
              </div>
            </details>
          </Reveal>
        ))}
      </RevealGroup>
    </section>
  );
}
