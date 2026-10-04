'use client';

import { Apple, Play } from 'lucide-react';

import type { LandingCopy } from '@/lib/landing-copy';
import { PLAY_STORE_URL } from '@/lib/site';

import { useNotify } from './NotifyProvider';

type Store = 'appstore' | 'googleplay';

type StoreBadgeProps = {
  store: Store;
  /** 로케일 카피 사전(라벨·리본 문구 출처). */
  copy: LandingCopy;
  /** 리본 문구 override. 기본은 copy.storeBadge.ribbon(컴팩트 시 ribbonCompact). */
  ribbon?: string;
  /** 컴팩트 모드(MobileCtaBar용). */
  compact?: boolean;
  className?: string;
};

/**
 * 스토어 배지.
 * - Google Play: 2026-07-03 정식 출시됨 → 실제 스토어 상세 페이지로 링크한다(리본 없음).
 * - App Store: iOS 미출시 → 클릭 시 스토어가 아니라 출시 알림 모달을 연다(정직 규칙 §7).
 *   "출시 알림 받기" 리본으로 이것이 다운로드가 아님을 명시해 오인을 방지한다.
 */
export function StoreBadge({
  store,
  copy,
  ribbon,
  compact = false,
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

  const badgeClass = `group flex items-center gap-2.5 rounded-2xl bg-(--color-ink) text-white shadow-(--shadow-card) transition-all duration-200 ease-(--ease-standard) hover:-translate-y-1 hover:shadow-(--shadow-float) active:scale-[0.98] ${
    compact ? 'px-3 py-2' : 'px-5 py-3'
  }`;

  // 아이콘·라벨 내부 구성(링크/버튼 양쪽 공용).
  const inner = (
    <>
      {/* 아이콘은 App Store·Google Play 모두 흰색으로 통일. */}
      <Icon size={compact ? 20 : 26} aria-hidden="true" />
      <span className="flex flex-col items-start leading-none">
        <span
          className={`${compact ? 'text-[9px]' : 'text-[11px]'} font-medium tracking-wide text-white/80`}
        >
          {meta.top}
        </span>
        <span
          className={`${compact ? 'text-sm' : 'text-lg'} font-semibold tracking-tight`}
        >
          {meta.bottom}
        </span>
      </span>
    </>
  );

  return (
    <div className={`relative inline-block ${className ?? ''}`}>
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
        <button
          type="button"
          onClick={openNotify}
          aria-label={meta.aria}
          className={badgeClass}
        >
          {inner}
        </button>
      )}
      {/* 리본은 미출시(App Store)에만 — "출시 알림 받기"임을 명시(정직 표기). */}
      {!isLive ? (
        <span
          className={`pointer-events-none absolute -right-2 -top-2 rotate-6 rounded-full bg-(--color-accent) px-2 py-0.5 font-semibold text-white shadow-(--shadow-card) ${
            compact ? 'text-[9px]' : 'text-[10px]'
          }`}
        >
          {ribbonText}
        </span>
      ) : null}
    </div>
  );
}
