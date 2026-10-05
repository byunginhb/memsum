'use client';

import { useEffect, useState } from 'react';

import type { LandingCopy } from '@/lib/landing-copy';

import { StoreBadge } from './StoreBadge';

/** 히어로를 벗어났다고 보는 스크롤 비율(뷰포트 높이 대비). */
const SHOW_AFTER_VIEWPORT = 0.8;

/**
 * 모바일 상시 전환 유도 바 — 앱 탭바처럼 바닥에서 떨어진 잉크색 알약.
 * 히어로를 벗어나면 아래에서 올라온다. 모바일 전용(lg:hidden).
 */
export function MobileCtaBar({ copy }: { copy: LandingCopy }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setVisible(window.scrollY > window.innerHeight * SHOW_AFTER_VIEWPORT);
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      className={`on-ink fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 transition-transform duration-300 ease-(--ease-standard) motion-reduce:transition-none lg:hidden ${
        visible ? 'translate-y-0' : 'pointer-events-none translate-y-[140%]'
      }`}
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
      aria-hidden={visible ? undefined : true}
      inert={visible ? undefined : true}
    >
      <div className="flex items-center gap-1 rounded-full bg-ink p-1.5 pr-3 pl-3 shadow-[0_10px_30px_rgba(13,14,18,0.28)]">
        <StoreBadge store="googleplay" copy={copy} compact tone="bare" />
        <span aria-hidden="true" className="h-6 w-px bg-rule-on-ink" />
        <StoreBadge store="appstore" copy={copy} compact tone="bare" />
      </div>
    </div>
  );
}
