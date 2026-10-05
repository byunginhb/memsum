import { CropFrame } from '@/components/brand/CropFrame';
import type { LandingCopy } from '@/lib/landing-copy';
import { SCREEN_SIZE, screenSrc } from '@/lib/screens';

/**
 * 기능 — 왼쪽에 결과 화면 한 장(스크롤 동안 고정), 오른쪽에 머리카락 구분선으로 나눈 기능 목록.
 * 기능 사이에 순서가 없으므로 번호를 달지 않는다.
 */
export function FeatureShowcase({ copy }: { copy: LandingCopy }) {
  const c = copy.features;
  const lang = copy.isKorean ? 'ko' : 'en';

  return (
    <section aria-label={c.sectionAria} className="border-y border-rule bg-surface">
      <div className="wrap grid gap-14 py-20 sm:py-24 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            <CropFrame className="mx-auto w-[min(68vw,18rem)] [--crop-len:18px] lg:mx-0 lg:w-[19rem]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={screenSrc(lang, 'search')}
                alt={c.phoneAlt}
                width={SCREEN_SIZE.width}
                height={SCREEN_SIZE.height}
                loading="lazy"
                className="block w-full rounded-[10px] shadow-[0_0_0_1px_var(--color-rule)]"
              />
            </CropFrame>
          </div>
        </div>

        <ul className="lg:col-span-7">
          {c.items.map((item) => (
            <li
              key={item.title}
              className="border-t border-rule py-8 first:border-t-2 first:border-ink sm:py-10"
            >
              <h3 className="text-[clamp(1.25rem,2.2vw,1.625rem)] leading-[1.3] font-bold tracking-[-0.025em]">
                {item.title}
              </h3>
              <p className="mt-3 max-w-[38rem] text-[16px] leading-[1.75] text-ink-2">{item.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
