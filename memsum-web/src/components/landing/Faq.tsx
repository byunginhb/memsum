import type { LandingCopy } from '@/lib/landing-copy';

import { FaqNotifyCta } from './FaqNotifyCta';

/**
 * 자주 묻는 질문 — 왼쪽 제목(데스크톱에서 고정), 오른쪽 구분선 아코디언.
 * <details>/<summary> 네이티브라 JS 없이 동작하고 키보드로 열고 닫힌다. 첫 항목만 기본 열림.
 */
export function Faq({ copy }: { copy: LandingCopy }) {
  const c = copy.faq;

  return (
    <section aria-labelledby="faq-title" className="wrap py-20 sm:py-24">
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-4">
          <h2 id="faq-title" className="t-title text-[clamp(1.875rem,4.4vw,3rem)] lg:sticky lg:top-28">
            {c.title}
          </h2>
        </div>
        <div className="border-t-2 border-ink lg:col-span-8">
          {c.items.map((item, index) => (
            <details key={item.q} className="faq-item border-b border-rule" open={index === 0}>
              <summary className="flex min-h-16 items-center justify-between gap-6 py-5 text-[17px] leading-[1.45] font-bold tracking-[-0.015em] hover:text-cobalt sm:text-[19px]">
                <span>{item.q}</span>
                <span aria-hidden="true" className="faq-cross text-cobalt" />
              </summary>
              <div className="pr-10 pb-7">
                <p className="text-[16px] leading-[1.75] text-ink-2">{item.a}</p>
                {item.ctaLabel ? <FaqNotifyCta label={item.ctaLabel} /> : null}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
