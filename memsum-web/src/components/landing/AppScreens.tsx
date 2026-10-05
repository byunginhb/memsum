import type { LandingCopy } from '@/lib/landing-copy';
import { SCREEN_SIZE, screenKeyFromLegacySrc, screenSrc } from '@/lib/screens';

/**
 * 앱 화면 미리보기 — 새 디자인 실제 화면 3장을 나란히. 기기 목업·그림자 없이 화면 그대로.
 * 모바일에선 섹션 안에서만 옆으로 넘기는 줄(페이지 자체는 가로로 밀리지 않음).
 */
export function AppScreens({ copy }: { copy: LandingCopy }) {
  const c = copy.appScreens;
  const lang = copy.isKorean ? 'ko' : 'en';

  return (
    <section aria-labelledby="screens-title" className="py-20 sm:py-24">
      <div className="wrap flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-10">
        <h2 id="screens-title" className="t-title text-[clamp(1.875rem,4.4vw,3rem)]">
          {c.title}
        </h2>
        <p className="max-w-sm text-[17px] leading-[1.7] text-ink-2 md:text-right">{c.subtitle}</p>
      </div>

      <div className="wrap mt-12">
        <ul className="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-6 sm:overflow-visible sm:px-0 lg:gap-10">
          {c.items.map((s) => (
            <li key={s.src} className="w-[70%] shrink-0 snap-start sm:w-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={screenSrc(lang, screenKeyFromLegacySrc(s.src))}
                alt={s.alt}
                width={SCREEN_SIZE.width}
                height={SCREEN_SIZE.height}
                loading="lazy"
                className="block w-full rounded-[10px] shadow-[0_0_0_1px_var(--color-rule)]"
              />
              <p className="mt-5 border-t border-ink pt-3 text-[15px] font-semibold">{s.caption}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
