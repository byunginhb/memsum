import { ChevronDown } from 'lucide-react';

import { SITE_NAME } from '@/lib/site';
import type { LandingCopy } from '@/lib/landing-copy';

import { NotifyButton } from './NotifyButton';
import { Reveal } from './Reveal';
import { StoreBadge } from './StoreBadge';

/** 스캔 그리드 타일용 OCR 칩(장식) — 앱이 스크린샷에서 뽑아낸 라벨을 실연.
 *  로케일별 한 벌. 실제 카피가 아닌 시그니처 예시라 별도로 둔다. */
type Chip = { cat: string; title: string };
const CHIPS_KO: Chip[] = [
  { cat: '마케팅', title: '스타벅스 쿠폰' },
  { cat: '일정', title: '이번 주 미팅' },
  { cat: '영수증', title: '올리브영 2.4만' },
  { cat: '정보', title: '파이썬 강의 링크' },
  { cat: '쇼핑', title: '무신사 세일' },
  { cat: '기타', title: '캡처된 글' },
];
const CHIPS_EN: Chip[] = [
  { cat: 'Marketing', title: 'Starbucks coupon' },
  { cat: 'Event', title: 'Team meeting' },
  { cat: 'Receipt', title: 'Oliveyoung ₩24k' },
  { cat: 'Info', title: 'Python course link' },
  { cat: 'Shopping', title: 'Musinsa sale' },
  { cat: 'Other', title: 'Saved note' },
];

// 타일 상단 밴드 색(카테고리 힌트) — 라벤더·코랄 가족 + 뉴트럴로 "다양한 스크린샷" 느낌.
const TINTS = ['#C9C0F2', '#F6C79A', '#C7DDD0', '#CBD6F0', '#EAD1E6', '#D6D1EA', '#F3D0C4', '#C9C0F2', '#CDE0D6'];
// 스켈레톤 본문 줄 너비 세트(타일마다 회전 → 유기적 더미).
const LINES = ['82%', '64%', '92%', '48%', '74%'];
// 칩이 붙는 타일 인덱스(체커보드) — 나머지는 라벨 없는 '더미' 타일.
const CHIP_AT = [0, 2, 3, 5, 6, 8];

/**
 * S1 Hero — 컨셉 "Scan". 앱을 설명하지 않고 실연한다:
 * 오른쪽 스크린샷 그리드가 흐릿하게 시작 → 라벤더 스캔 바가 위→아래로 훑으면
 * 지나간 행이 선명해지고 OCR 라벨 칩이 떠오른다(3초 안에 동작 원리 전달).
 * 모션은 순수 CSS(행별 animation-delay), reduced-motion 시 전부 즉시 선명.
 * 텍스트는 SSR(LCP 보호). 카피는 로케일 사전에서 원문 그대로 주입.
 */
export function Hero({ copy }: { copy: LandingCopy }) {
  const c = copy.hero;
  const bk = copy.isKorean ? 'break-keep' : '';
  const h1Line2 = c.h1Line2.replace('{site}', SITE_NAME);
  const subLine2 = c.subLine2.replace('{site}', SITE_NAME);
  const chips = copy.isKorean ? CHIPS_KO : CHIPS_EN;

  // 9타일(3×3). 행이 내려갈수록 스캔 바 통과 시점이 늦으므로 resolve 지연 증가.
  const tiles = Array.from({ length: 9 }, (_, i) => {
    const row = Math.floor(i / 3);
    const chipIdx = CHIP_AT.indexOf(i);
    return {
      i,
      tint: TINTS[i % TINTS.length],
      chip: chipIdx >= 0 ? chips[chipIdx] : null,
      // 스캔 바: 0.3s 딜레이 후 1.6s 스윕 → 각 행 중앙 통과 시점에 맞춰 깨어남.
      delay: 380 + row * 540,
    };
  });

  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-5 pt-14 pb-20 sm:px-6 lg:grid-cols-12 lg:gap-6 lg:pt-24 lg:pb-28">
        {/* 좌측 텍스트 45% (5/12) */}
        <div className="lg:col-span-5">
          {/* eyebrow — 알약 대신 헤어라인 + 모노 라벨 */}
          <Reveal as="div" delay={0} className="flex items-center gap-3">
            <span aria-hidden="true" className="h-px w-8 bg-(--color-primary)" />
            <span className="font-mono text-[11px] font-semibold tracking-[0.22em] text-(--color-ink-soft)">
              {c.eyebrow}
            </span>
          </Reveal>

          {/* 800 ↔ 200 교번 — "찍는 행위(굵게)"와 "알아서 처리(얇게)"를 타이포가 말한다 */}
          <h1
            id="hero-title"
            className={`mt-6 tracking-tight ${bk}`}
            style={{
              fontSize: 'clamp(2.375rem, 5.4vw, 4.25rem)',
              lineHeight: 1.06,
              letterSpacing: '-0.035em',
            }}
          >
            <Reveal as="span" delay={90} className="block" style={{ fontWeight: 800 }}>
              {c.h1Line1}
            </Reveal>
            <Reveal as="span" delay={180} className="block" style={{ fontWeight: 200 }}>
              {h1Line2}
              <span
                aria-hidden="true"
                className="ml-1 inline-block h-2.5 w-2.5 rounded-full bg-(--color-accent) align-baseline"
              />
            </Reveal>
          </h1>

          <Reveal
            as="p"
            delay={300}
            className={`mt-6 max-w-md text-lg leading-relaxed ${bk} text-(--color-ink-soft)`}
          >
            {c.subLine1}
            <br />
            {subLine2}
          </Reveal>

          <div className="mt-8 flex flex-col items-start gap-4">
            <Reveal variant="scale-in" delay={420}>
              <NotifyButton copy={copy} />
            </Reveal>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Reveal variant="scale-in" delay={480}>
                <StoreBadge store="appstore" copy={copy} />
              </Reveal>
              <Reveal variant="scale-in" delay={540}>
                <StoreBadge store="googleplay" copy={copy} />
              </Reveal>
            </div>
          </div>

          <Reveal
            as="p"
            variant="fade"
            delay={560}
            className={`mt-5 text-sm ${bk} text-(--color-ink-faint)`}
          >
            {c.helper}
          </Reveal>
        </div>

        {/* 우측 스캔 그리드 55% (7/12) */}
        <div className="lg:col-span-7">
          <Reveal
            variant="fade"
            delay={260}
            className="relative mx-auto w-full max-w-md lg:max-w-none lg:[mask-image:linear-gradient(to_right,transparent,#000_22%)]"
          >
            <div className="grid grid-cols-3 gap-2.5">
              {tiles.map((t) => (
                <div
                  key={t.i}
                  className="scan-tile relative aspect-[4/5] overflow-hidden rounded-xl border border-(--color-line) bg-(--color-card) shadow-(--shadow-card)"
                  style={{ ['--resolve-delay' as string]: `${t.delay}ms` }}
                >
                  {/* faux 스크린샷 본문 */}
                  <div className="h-2.5 w-full" style={{ backgroundColor: t.tint }} />
                  <div className="space-y-1.5 p-2.5">
                    {LINES.map((w, k) => (
                      <div
                        key={k}
                        className="h-1.5 rounded bg-(--color-line)"
                        style={{ width: LINES[(t.i + k) % LINES.length] }}
                      />
                    ))}
                  </div>
                  {/* OCR 라벨 칩 — 스캔 통과 시점에 떠오름 */}
                  {t.chip && (
                    <span className="ocr-chip absolute left-1.5 top-1.5 flex max-w-[92%] items-center gap-1 rounded-md bg-white/95 px-1.5 py-1 shadow-sm ring-1 ring-(--color-line)">
                      <span className="rounded bg-(--color-primary-soft) px-1 font-mono text-[8px] font-bold leading-none text-(--color-primary)">
                        {t.chip.cat}
                      </span>
                      <span className="truncate font-mono text-[9px] font-medium leading-none text-(--color-ink)">
                        {t.chip.title}
                      </span>
                    </span>
                  )}
                </div>
              ))}
            </div>
            {/* 스캔 바 — 그리드 위를 위→아래로 훑는 라벤더 선(+글로우) */}
            <div className="scan-bar" aria-hidden="true" />
          </Reveal>
        </div>
      </div>

      {/* 스크롤 힌트 */}
      <div className="relative flex justify-center pb-8">
        <a
          href="#how-it-works"
          className="flex flex-col items-center gap-1.5 text-sm text-(--color-ink-soft) transition-colors hover:text-(--color-ink)"
        >
          <span className={bk}>{c.scrollHint}</span>
          <ChevronDown size={20} aria-hidden="true" className="hint-bounce text-(--color-primary)" />
        </a>
      </div>
    </section>
  );
}
