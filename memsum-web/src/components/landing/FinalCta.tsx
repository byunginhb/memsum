import { BrandMark } from '@/components/brand/BrandMark';
import { RevealText } from '@/components/brand/RevealText';
import type { LandingCopy } from '@/lib/landing-copy';

/** 제목에서 형광펜을 그을 구절(카피 원문의 일부). */
const TITLE_MARK = { ko: '다시 떠올려드릴게요.', en: 'Memsum will bring it back.' } as const;

import { NotifyButton } from './NotifyButton';
import { StoreBadge } from './StoreBadge';

/**
 * 마지막 권유 — 페이지에서 유일한 잉크 면. 앱 아이콘과 같은 타일 마크 + 큰 한 문장.
 */
export function FinalCta({ copy }: { copy: LandingCopy }) {
  const c = copy.finalCta;
  const lang = copy.isKorean ? 'ko' : 'en';

  return (
    // 다가올수록 종이가 잉크로 저문다(cta-ink + ScrollFx range). JS가 없으면 처음부터 잉크 면.
    <section
      aria-labelledby="final-cta-title"
      className="cta-ink on-ink text-paper"
      data-fx="range"
      data-fx-start="1"
      data-fx-end="0.7"
      data-fx-tau="140"
    >
      <div className="wrap pt-24 pb-20 sm:pt-32 sm:pb-28">
        <div data-rv="" className="[--rv-d:0ms]">
          <BrandMark size={64} variant="tile" />
        </div>
        <h2
          id="final-cta-title"
          data-rv="title"
          className="t-display mt-10 max-w-4xl text-[clamp(2.125rem,6vw,4.25rem)]"
        >
          <RevealText text={c.title} mark={TITLE_MARK[lang]} markStyle="underline" />
        </h2>
        <p data-rv="" className="mt-6 max-w-xl text-[18px] leading-[1.6] text-paper-2 [--rv-d:300ms]">{c.body}</p>

        <div data-rv="" className="mt-10 flex flex-wrap items-center gap-x-3 gap-y-5 [--rv-d:420ms]">
          <StoreBadge store="googleplay" copy={copy} tone="paper" />
          <StoreBadge store="appstore" copy={copy} tone="paper" />
        </div>
        <div data-rv="" className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-rule-on-ink pt-6 [--rv-d:520ms]">
          <NotifyButton copy={copy} onInk />
          <p className="text-[13px] text-paper-2">{c.helper}</p>
        </div>
      </div>
    </section>
  );
}
