import { Info } from 'lucide-react';

import type { LandingCopy } from '@/lib/landing-copy';

/**
 * 택배 추적(한국어 랜딩 전용) — 왼쪽 설명, 오른쪽 구분선 목록.
 * 세 항목은 정의 목록(제목 → 설명)으로, 아이콘 반복 없이 글자 위계로만 나눈다.
 */
export function ParcelSection({ copy }: { copy: LandingCopy }) {
  const c = copy.parcel;

  return (
    <section aria-labelledby="parcel-title" className="wrap py-20 sm:py-24">
      <div className="grid gap-12 border-t border-rule pt-12 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-5">
          <p className="t-eyebrow">{c.eyebrow}</p>
          <h2 id="parcel-title" className="t-title mt-4 text-[clamp(1.875rem,4.4vw,3rem)]">
            {c.title}
          </h2>
          <p className="mt-6 text-[17px] leading-[1.7] text-ink-2">{c.sub}</p>
          <p className="mt-6 border-l-2 border-cobalt pl-4 text-[15px] font-semibold">{c.carriers}</p>
        </div>

        <div className="lg:col-span-7">
          <dl className="border-t-2 border-ink">
            {c.bullets.map((b) => (
              <div
                key={b.title}
                className="grid gap-2 border-b border-rule py-7 sm:grid-cols-[minmax(0,15rem)_1fr] sm:gap-8"
              >
                <dt className="text-[18px] leading-[1.4] font-bold tracking-[-0.02em]">{b.title}</dt>
                <dd className="text-[16px] leading-[1.7] text-ink-2">{b.body}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 flex gap-2 text-[13.5px] leading-[1.6] text-ink-2">
            <Info size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
            <span>{c.disclaimer}</span>
          </p>
        </div>
      </div>
    </section>
  );
}
