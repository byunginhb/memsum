'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/** 화면에 이만큼 들어와야 스캔을 시작한다. */
const PLAY_RATIO = 0.45;

/**
 * 히어로 스캔 무대 — 스캔은 CSS 애니메이션이라 JS 없이도 로드 직후 재생된다.
 * 다만 모바일처럼 첫 화면 아래에 있으면 아무도 못 본 채 끝나므로,
 * 그때만 애니메이션을 멈춰 두었다가(data-armed) 화면에 들어오는 순간 처음부터 재생한다.
 */
export function ScanStage({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = el.getBoundingClientRect();
    // 이미 보이는 자리(데스크톱 첫 화면)면 로드 때 시작한 재생을 그대로 둔다.
    if (rect.top < window.innerHeight * (1 - PLAY_RATIO)) return;

    el.dataset.armed = '';
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        delete el.dataset.armed;
      },
      { threshold: PLAY_RATIO },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
