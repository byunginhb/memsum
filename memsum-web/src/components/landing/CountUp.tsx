'use client';

import { useEffect, useRef, useState } from 'react';

type CountUpProps = {
  to: number;
  /** 지속(ms). 앱 motion.duration.count 와 같은 600ms. */
  duration?: number;
  className?: string;
};

/** 화면에 이 비율 이상 들어오면 센다. */
const VISIBLE_RATIO = 0.6;

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

/**
 * 숫자 카운트업 — 처음 화면에 들어올 때 한 번 0→to.
 * 서버 렌더와 JS 이전 상태는 최종값이라 크롤러·스크린리더·reduced-motion 모두 최종 숫자를 본다.
 */
export function CountUp({ to, duration = 600, className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(to);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let raf = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min((now - start) / duration, 1);
          setValue(Math.round(easeOutCubic(p) * to));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: VISIBLE_RATIO },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to, duration]);

  return (
    <span ref={ref} className={className}>
      {/* 자리 흔들림 방지: 최종 자릿수 폭을 유지(tabular-nums) */}
      {value.toLocaleString('en-US')}
    </span>
  );
}
