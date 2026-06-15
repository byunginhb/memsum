'use client';

import { Apple, Play } from 'lucide-react';

import type { LandingCopy } from '@/lib/landing-copy';

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
 * 기대형 스토어 배지(Anticipation Badge).
 * 시각적으로는 정식 스토어 배지처럼 설치 욕구를 자극하되,
 * 앱 미출시 상태이므로 클릭 시 외부 스토어로 가지 않고 출시 알림 모달을 연다(정직 규칙 §7).
 * 스크린리더에는 "출시 알림 신청"으로 읽혀 오인을 방지한다.
 * 리본은 컴팩트 바에서 가장 좁으므로 ribbonCompact(영어 "Soon")로 폴백한다.
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
  // 컴팩트(모바일 바)는 가장 좁은 자리 → 짧은 최종형 리본.
  const ribbonText =
    ribbon ?? (compact ? copy.storeBadge.ribbonCompact : copy.storeBadge.ribbon);

  return (
    <div className={`relative inline-block ${className ?? ''}`}>
      <button
        type="button"
        onClick={openNotify}
        aria-label={meta.aria}
        className={`group flex items-center gap-2.5 rounded-2xl bg-(--color-ink) text-white shadow-(--shadow-card) transition-all duration-200 ease-(--ease-standard) hover:-translate-y-1 hover:shadow-(--shadow-float) active:scale-[0.98] ${
          compact ? 'px-3 py-2' : 'px-5 py-3'
        }`}
      >
        {/* 아이콘은 App Store·Google Play 모두 흰색으로 통일(코랄은 "출시 준비 중"
            리본 한 곳에만 — 히어로 코랄 군집 완화). */}
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
      </button>
      {/* 출시 준비 중 리본 — 정직 표기(희소성·기대 유발) */}
      <span
        className={`pointer-events-none absolute -right-2 -top-2 rotate-6 rounded-full bg-(--color-accent) px-2 py-0.5 font-semibold text-white shadow-(--shadow-card) ${
          compact ? 'text-[9px]' : 'text-[10px]'
        }`}
      >
        {ribbonText}
      </span>
    </div>
  );
}
