'use client';

import { useEffect, useRef, useState } from 'react';

import { useReveal } from '@/hooks/use-reveal';

type AnimatedDotsLogoProps = {
  size?: number;
  /** 트리거: 마운트 직후('load') 또는 뷰포트 진입('inView'). */
  trigger?: 'load' | 'inView';
  /** 흰 배경(false) vs 보라 패널 위(true)에 따라 타일/점 색 반전. */
  onPurple?: boolean;
  className?: string;
};

const INDICES = [0, 1, 2, 3, 4, 5, 6, 7, 8];

/**
 * DotsLogo의 모션 버전 — 9점이 작게→3×3 그리드로 settle, 마지막 점은 코랄 전환.
 * SSR/reduced-motion 시 정적 9닷 마크로 폴백(콘텐츠 손실 없음).
 * 앱 로고 "9점 spring 정렬" 모션을 CSS keyframe(dot-settle)으로 재현.
 */
export function AnimatedDotsLogo({
  size = 64,
  trigger = 'load',
  onPurple = false,
  className,
}: AnimatedDotsLogoProps) {
  const [play, setPlay] = useState(false);
  const { ref: inViewRef, revealed } = useReveal<HTMLDivElement>({
    threshold: 0.4,
  });
  const mountedRef = useRef(false);

  // load 트리거: H1 LCP 페인트 이후 시작(delay 200ms). reduced-motion 시 정적 폴백.
  useEffect(() => {
    if (trigger !== 'load' || mountedRef.current) return;
    mountedRef.current = true;
    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (prefersReduced) return; // 초기 상태(play=false) 유지 → 정적 9닷.
    const timer = window.setTimeout(() => setPlay(true), 200);
    return () => window.clearTimeout(timer);
  }, [trigger]);

  // inView 트리거.
  useEffect(() => {
    if (trigger !== 'inView' || !revealed) return;
    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (prefersReduced) return;
    const timer = window.setTimeout(() => setPlay(true), 0);
    return () => window.clearTimeout(timer);
  }, [trigger, revealed]);

  const pad = size * 0.22;
  const gap = (size - pad * 2) / 2;
  const r = size * 0.09;

  const tileFill = onPurple ? '#ffffff' : '#7C6FE8';
  const dotFill = onPurple ? '#7C6FE8' : '#ffffff';

  return (
    <div
      ref={trigger === 'inView' ? inViewRef : undefined}
      className={className}
      aria-hidden="true"
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label="Memsum 로고"
      >
        <rect
          width={size}
          height={size}
          rx={size * 0.24}
          fill={tileFill}
          opacity={onPurple ? 0.16 : 1}
        />
        {INDICES.map((index) => {
          const col = index % 3;
          const row = Math.floor(index / 3);
          const accent = index === 8;
          return (
            <circle
              key={index}
              cx={pad + col * gap}
              cy={pad + row * gap}
              r={r}
              fill={accent ? '#F2A65A' : dotFill}
              className={play ? 'dot-settle' : undefined}
              style={
                play
                  ? { animationDelay: `${index * 50}ms` }
                  : undefined
              }
            />
          );
        })}
      </svg>
    </div>
  );
}
