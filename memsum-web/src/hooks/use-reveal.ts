'use client';

import { useEffect, useRef, useState } from 'react';

type UseRevealOptions = {
  /** 뷰포트 진입 비율(0~1). 기본 0.15. */
  threshold?: number;
  /** 한 번 보이면 관찰 해제(역방향 모션 없음). 기본 true. */
  once?: boolean;
  /** rootMargin 직접 지정(특수 트리거용). */
  rootMargin?: string;
};

/**
 * IntersectionObserver 기반 reveal 트리거.
 * reduced-motion 환경에서는 관찰을 건너뛰고 즉시 revealed 처리한다(콘텐츠는 항상 보임).
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>({
  threshold = 0.15,
  once = true,
  rootMargin = '0px 0px -10% 0px',
}: UseRevealOptions = {}): { ref: React.RefObject<T | null>; revealed: boolean } {
  const ref = useRef<T>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // reduced-motion 또는 IO 미지원 → 다음 프레임에 즉시 표시(콘텐츠 손실 없음).
    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (prefersReduced || typeof IntersectionObserver === 'undefined') {
      const raf = requestAnimationFrame(() => setRevealed(true));
      return () => cancelAnimationFrame(raf);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setRevealed(true);
            if (once) observer.disconnect();
          } else if (!once) {
            setRevealed(false);
          }
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, once, rootMargin]);

  return { ref, revealed };
}
