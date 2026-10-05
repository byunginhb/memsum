import { BrandMark } from '@/components/brand/BrandMark';
import type { LandingCopy } from '@/lib/landing-copy';

import { NotifyButton } from './NotifyButton';
import { StoreBadge } from './StoreBadge';

/**
 * 마지막 권유 — 페이지에서 유일한 잉크 면. 앱 아이콘과 같은 타일 마크 + 큰 한 문장.
 */
export function FinalCta({ copy }: { copy: LandingCopy }) {
  const c = copy.finalCta;

  return (
    <section aria-labelledby="final-cta-title" className="on-ink bg-ink text-paper">
      <div className="wrap py-20 sm:py-24">
        <BrandMark size={64} variant="tile" />
        <h2
          id="final-cta-title"
          className="t-display mt-10 max-w-4xl text-[clamp(2.125rem,6vw,4.25rem)]"
        >
          {c.title}
        </h2>
        <p className="mt-6 max-w-xl text-[18px] leading-[1.6] text-paper-2">{c.body}</p>

        <div className="mt-10 flex flex-wrap items-center gap-x-3 gap-y-5">
          <StoreBadge store="googleplay" copy={copy} tone="paper" />
          <StoreBadge store="appstore" copy={copy} tone="paper" />
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-rule-on-ink pt-6">
          <NotifyButton copy={copy} onInk />
          <p className="text-[13px] text-paper-2">{c.helper}</p>
        </div>
      </div>
    </section>
  );
}
