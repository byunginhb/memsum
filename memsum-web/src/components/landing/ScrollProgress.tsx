'use client';

import { useScrollProgress } from '@/hooks/use-scroll-progress';

/** 화면 최상단 고정 2px 코랄 게이지. transform: scaleX로 진행(리플로우 없음). */
export function ScrollProgress() {
  const progress = useScrollProgress();

  return (
    <div
      aria-hidden="true"
      className="fixed inset-x-0 top-0 z-50 h-[2px] bg-transparent"
    >
      <div
        className="h-full origin-left bg-(--color-accent)"
        style={{ transform: `scaleX(${progress})` }}
      />
    </div>
  );
}
