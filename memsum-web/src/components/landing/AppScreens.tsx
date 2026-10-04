import type { LandingCopy } from '@/lib/landing-copy';

import { Reveal } from './Reveal';

/**
 * 앱 화면 미리보기 — 실제 앱 화면(기기 목업)을 나열해 "받으면 이렇게 보인다"를 전시.
 * 이미지는 투명 배경 + 라벤더 글로우 그림자가 구워져 있어 별도 카드 프레임이 필요 없다.
 * 카피는 로케일 사전(`copy.appScreens`)에서 주입.
 */
export function AppScreens({ copy }: { copy: LandingCopy }) {
  const c = copy.appScreens;
  const bk = copy.isKorean ? 'break-keep' : '';

  return (
    <section
      aria-labelledby="screens-title"
      className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-6 sm:py-24"
    >
      <Reveal
        as="h2"
        id="screens-title"
        className={`text-center text-2xl font-bold tracking-tight ${bk} sm:text-4xl`}
      >
        {c.title}
      </Reveal>
      <Reveal
        as="p"
        delay={80}
        className={`mx-auto mt-4 max-w-xl text-center text-base leading-relaxed ${bk} text-(--color-ink-soft) sm:text-lg`}
      >
        {c.subtitle}
      </Reveal>

      {/* 기기 목업은 항상 표시(reveal opacity 게이팅 없이) — 실제 화면 전시가 목적이라
          마지막 항목까지 확실히 보이게 한다. */}
      <div className="mt-14 grid gap-8 sm:grid-cols-3">
        {c.items.map((s) => (
          <div key={s.src} className="flex flex-col items-center">
            <div className="flex h-[480px] w-full items-end justify-center">
              {/* 장식용 기기 목업(투명 PNG, 그림자 내장). next/image 대신 img로 단순 표시. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.src}
                alt={s.alt}
                loading="lazy"
                className="max-h-full w-auto"
              />
            </div>
            <p className={`mt-6 text-center text-sm ${bk} text-(--color-ink-soft)`}>
              {s.caption}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
