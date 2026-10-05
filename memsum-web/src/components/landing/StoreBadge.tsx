'use client';

import { Apple, Play } from 'lucide-react';

import type { LandingCopy } from '@/lib/landing-copy';
import { PLAY_STORE_URL } from '@/lib/site';

import { useNotify } from './NotifyProvider';

type Store = 'appstore' | 'googleplay';

/**
 * ink: 종이 위 잉크 배지(기본). paper: 잉크 섹션 위 종이 배지. bare: 잉크 알약 바 안의 납작한 배지.
 */
type Tone = 'ink' | 'paper' | 'bare';

type StoreBadgeProps = {
  store: Store;
  /** 로케일 카피 사전(라벨·리본 문구 출처). */
  copy: LandingCopy;
  /** 리본 문구 override. 기본은 copy.storeBadge.ribbon(컴팩트 시 ribbonCompact). */
  ribbon?: string;
  /** 컴팩트 모드(MobileCtaBar용). */
  compact?: boolean;
  tone?: Tone;
  className?: string;
};

const TONE_CLASS: Record<Tone, string> = {
  ink: 'bg-ink text-paper hover:bg-[#23252d]',
  paper: 'bg-paper text-ink hover:bg-white',
  bare: 'bg-transparent text-paper hover:bg-white/10',
};

/**
 * 스토어 배지.
 * - Google Play: 2026-07-03 정식 출시됨 → 실제 스토어 상세 페이지로 링크한다(리본 없음).
 * - App Store: iOS 미출시 → 클릭 시 스토어가 아니라 출시 알림 모달을 연다(정직 규칙 §7).
 *   형광펜 꼬리표("출시 알림 받기")로 이것이 다운로드가 아님을 명시해 오인을 방지한다.
 */
export function StoreBadge({
  store,
  copy,
  ribbon,
  compact = false,
  tone = 'ink',
  className,
}: StoreBadgeProps) {
  const { openNotify } = useNotify();
  const meta = copy.storeBadge[store];
  const Icon = store === 'appstore' ? Apple : Play;
  // Google Play는 실제 출시본 → 링크. App Store는 미출시 → 알림 모달.
  const isLive = store === 'googleplay';
  // 컴팩트(모바일 바)는 가장 좁은 자리 → 짧은 최종형 리본.
  const ribbonText =
    ribbon ?? (compact ? copy.storeBadge.ribbonCompact : copy.storeBadge.ribbon);

  const badgeClass = `press flex items-center gap-2 rounded-[10px] sm:gap-2.5 ${TONE_CLASS[tone]} ${
    compact ? 'h-11 px-3' : 'h-14 px-3.5 pr-4 sm:px-4 sm:pr-5'
  }`;

  const inner = (
    <>
      <Icon size={compact ? 18 : 22} strokeWidth={2} aria-hidden="true" />
      <span lang="en" className="flex flex-col items-start leading-none">
        <span className={`${compact ? 'text-[8.5px]' : 'text-[10px]'} font-semibold uppercase tracking-[0.06em] opacity-75`}>
          {meta.top}
        </span>
        <span className={`${compact ? 'mt-0.5 text-[14px]' : 'mt-1 text-[17px] sm:text-[18px]'} font-bold tracking-[-0.02em]`}>
          {meta.bottom}
        </span>
      </span>
    </>
  );

  return (
    <div className={`relative inline-flex ${className ?? ''}`}>
      {isLive ? (
        <a
          href={PLAY_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={meta.aria}
          className={badgeClass}
        >
          {inner}
        </a>
      ) : (
        <button type="button" onClick={openNotify} aria-label={meta.aria} className={badgeClass}>
          {inner}
        </button>
      )}
      {/* 꼬리표는 미출시(App Store)에만 — "출시 알림 받기"임을 명시(정직 표기). 형광 바탕 + 잉크 글자. */}
      {!isLive ? (
        <span
          className={`pointer-events-none absolute -top-2.5 -right-2 -rotate-3 rounded-[4px] bg-marker px-1.5 py-0.5 font-bold whitespace-nowrap text-ink ${
            compact ? 'text-[10px]' : 'text-[11px]'
          }`}
        >
          {ribbonText}
        </span>
      ) : null}
    </div>
  );
}
