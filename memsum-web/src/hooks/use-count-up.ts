'use client';

import { useEffect, useRef, useState } from 'react';

type UseCountUpOptions = {
  /** 애니메이션 지속(ms). 기본 1200. */
  duration?: number;
  /** true가 되면 카운트 시작(예: revealed). */
  start?: boolean;
};

/** ease-out cubic — 끝에서 부드럽게 감속. */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * 0 → target 카운트업. 천 단위 콤마 포맷 문자열을 반환한다.
 * reduced-motion 시 즉시 최종값.
 */
export function useCountUp(
  target: number,
  { duration = 1200, start = false }: UseCountUpOptions = {},
): string {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!start || startedRef.current) return;
    startedRef.current = true;

    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (prefersReduced) {
      const raf = requestAnimationFrame(() => setValue(target));
      return () => cancelAnimationFrame(raf);
    }

    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setValue(Math.round(easeOutCubic(progress) * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [start, target, duration]);

  return value.toLocaleString('ko-KR');
}
