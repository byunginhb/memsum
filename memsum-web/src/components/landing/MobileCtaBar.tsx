'use client';

import { useEffect, useState } from 'react';

import type { LandingCopy } from '@/lib/landing-copy';

import { StoreBadge } from './StoreBadge';

/**
 * 모바일 상시 전환 유도 바.
 * 히어로를 벗어나면(스크롤 > 80vh) slide-up 등장. safe-area 패딩.
 * 모바일 전용(lg:hidden). 컴팩트 배지 리본은 가장 좁아 ribbonCompact를 쓴다.
 */
export function MobileCtaBar({ copy }: { copy: LandingCopy }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setVisible(window.scrollY > window.innerHeight * 0.8);
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-(--color-line) bg-(--color-card)/90 backdrop-blur-md transition-transform duration-300 ease-(--ease-standard) lg:hidden ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-center gap-3 px-4 py-3">
        <StoreBadge store="appstore" copy={copy} compact />
        <StoreBadge store="googleplay" copy={copy} compact />
      </div>
    </div>
  );
}
