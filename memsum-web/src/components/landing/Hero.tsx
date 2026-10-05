import { ArrowDown } from 'lucide-react';

import { CropFrame } from '@/components/brand/CropFrame';
import { Marked } from '@/components/brand/Marked';
import type { LandingCopy } from '@/lib/landing-copy';
import { homeScanBoxes, SCREEN_SIZE, screenSrc } from '@/lib/screens';
import { SITE_NAME } from '@/lib/site';

import { NotifyButton } from './NotifyButton';
import { ScanStage } from './ScanStage';
import { StoreBadge } from './StoreBadge';

/** 스캔 타이밍(ms) — globals.css 의 .scan-line 애니메이션과 같은 값. */
const SCAN_START = 300;
const SCAN_MS = 1400;
/** 선이 줄을 지난 뒤 형광펜이 그어지기까지의 짧은 틈. */
const MARK_LAG = 40;
/** 스캔이 끝나고 헤드라인 형광펜이 그어지는 시점. */
const HEADLINE_MARK_AT = SCAN_START + SCAN_MS + 160;

/** 헤드라인에서 형광펜을 칠할 핵심 구절(카피 원문의 일부 — 문구는 그대로). */
const HEADLINE_MARK = { ko: '대신 기억해요', en: 'remembers for you' } as const;

/**
 * 스캔선의 이징 cubic-bezier(0.4, 0, 0.6, 1)에서, 선이 높이 비율 y에 닿는 시간 비율을 구한다.
 * 형광펜이 선이 실제로 지나가는 순간에 그어지도록 맞추기 위함(이분 탐색, 빌드 시 계산).
 */
function scanTimeAt(y: number): number {
  const bez = (t: number, a: number, b: number) =>
    3 * a * t * (1 - t) ** 2 + 3 * b * t ** 2 * (1 - t) + t ** 3;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i += 1) {
    const mid = (lo + hi) / 2;
    if (bez(mid, 0, 1) < y) lo = mid;
    else hi = mid;
  }
  const s = (lo + hi) / 2; // 곡선 매개변수 → x(시간) 계산
  return bez(s, 0.4, 0.6);
}

/**
 * 히어로 — 이 제품의 정체성인 "스캔" 순간 하나.
 * 새 디자인 홈 화면 위로 코발트 스캔선이 지나가고, 선이 지난 일정 줄마다 형광펜이 그어진 뒤,
 * 마지막으로 헤드라인의 핵심 구절에 형광펜이 그어지며 끝난다. CSS 애니메이션만 쓰므로 JS 없이도 동작하고,
 * reduced-motion이면 처음부터 다 칠해진 최종 상태로 보인다.
 */
export function Hero({ copy }: { copy: LandingCopy }) {
  const c = copy.hero;
  const lang = copy.isKorean ? 'ko' : 'en';
  const h1Line2 = c.h1Line2.replace('{site}', SITE_NAME);
  const subLine2 = c.subLine2.replace('{site}', SITE_NAME);
  const boxes = homeScanBoxes(lang);

  return (
    <section aria-labelledby="hero-title" className="relative">
      <div className="wrap grid gap-14 pt-8 pb-14 sm:pt-14 lg:grid-cols-12 lg:items-center lg:gap-10 lg:pt-16 lg:pb-20">
        <div className="lg:col-span-7">
          <p className="t-eyebrow">{c.eyebrow}</p>

          <h1
            id="hero-title"
            className={`t-display mt-6 ${
              lang === 'ko' ? 'text-[clamp(2.5rem,7.4vw,4.75rem)]' : 'text-[clamp(2.125rem,6vw,4.25rem)]'
            }`}
          >
            <span className="block">{c.h1Line1}</span>
            <span className="block">
              {/* 형광펜 구절은 줄 사이에서 쪼개지지 않게 묶는다(한 줄 통째로 칠해져야 읽힌다). */}
              <Marked
                text={h1Line2}
                mark={HEADLINE_MARK[lang]}
                drawDelay={HEADLINE_MARK_AT}
                nowrap
              />
            </span>
          </h1>

          <p className="mt-7 max-w-[34rem] text-[17px] leading-[1.7] text-ink-2 sm:text-[18px]">
            <span className="block font-semibold text-ink">{c.subLine1}</span>
            <span className="mt-1 block">{subLine2}</span>
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-x-3 gap-y-5">
            <StoreBadge store="googleplay" copy={copy} />
            <StoreBadge store="appstore" copy={copy} />
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2">
            <NotifyButton copy={copy} />
            <p className="text-[13px] text-ink-2">{c.helper}</p>
          </div>
        </div>

        {/* 스캔 연출 — 홈 화면 위로 스캔. 왼쪽 아래에는 방금 찍은 스크린샷 미리보기처럼 5줄 리포트 화면이 떠 있다. */}
        <div className="relative flex justify-center lg:col-span-5 lg:justify-end">
          <ScanStage className="relative w-[min(74vw,20rem)] lg:mr-2 lg:w-[21rem]">
            <CropFrame className="[--crop-len:22px] [--crop-out:12px] [--crop-w:2.5px]">
              <div className="scan-frame">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={screenSrc(lang, 'home')}
                  alt={c.homeAlt}
                  width={SCREEN_SIZE.width}
                  height={SCREEN_SIZE.height}
                  fetchPriority="high"
                />
                {boxes.map((b, i) => (
                  <span
                    key={i}
                    aria-hidden="true"
                    className="scan-mark"
                    style={{
                      left: b.left,
                      top: b.top,
                      width: b.width,
                      height: b.height,
                      ['--d' as string]: `${Math.round(
                        SCAN_START + SCAN_MS * scanTimeAt(b.yFrac) + MARK_LAG,
                      )}ms`,
                    }}
                  />
                ))}
                <span aria-hidden="true" className="scan-line" />
              </div>
            </CropFrame>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={screenSrc(lang, 'report')}
              alt={c.reportAlt}
              width={SCREEN_SIZE.width}
              height={SCREEN_SIZE.height}
              className="absolute bottom-[-7%] left-[-9%] w-[36%] rounded-[8px] border-[3px] border-elevated bg-elevated shadow-[0_12px_32px_rgba(13,14,18,0.22)] lg:left-[-16%]"
            />
          </ScanStage>
        </div>
      </div>

      <div className="wrap">
        <a
          href="#how-it-works"
          className="group flex items-center justify-between border-t border-rule py-4 text-[14px] font-semibold text-ink-2 hover:text-ink"
        >
          <span>{c.scrollHint}</span>
          <ArrowDown
            size={18}
            aria-hidden="true"
            className="transition-transform duration-200 group-hover:translate-y-0.5"
          />
        </a>
      </div>
    </section>
  );
}
