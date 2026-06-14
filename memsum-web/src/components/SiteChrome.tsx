'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { DotsLogo } from '@/components/DotsLogo';
import { useOptionalNotify } from '@/components/landing/NotifyProvider';
import { OPERATOR_NAME, SUPPORT_EMAIL } from '@/lib/site';

/**
 * 공통 상단 바 — 로고 + 워드마크(홈 링크).
 * 스크롤 40px↓: backdrop-blur + cream 90% 배경 + 하단 line + 컴팩트 CTA("받기") 등장(§3.6).
 */
export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const notify = useOptionalNotify();

  // 프로바이더가 있으면 모달, 없으면(법적 페이지) mailto 폴백.
  const handleGet = () => {
    if (notify) {
      notify.openNotify();
      return;
    }
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
      'Memsum 출시 알림 신청',
    )}`;
  };

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > 40);
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-200 ease-(--ease-standard) ${
        scrolled
          ? 'border-b border-(--color-line) bg-(--color-cream)/90 shadow-(--shadow-card) backdrop-blur-md'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <DotsLogo size={32} />
          <span className="text-lg font-bold tracking-tight">Memsum</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm text-(--color-ink-soft)">
          <Link
            href="/privacy"
            className="hidden hover:text-(--color-ink) sm:inline"
          >
            개인정보처리방침
          </Link>
          <Link
            href="/terms"
            className="hidden hover:text-(--color-ink) sm:inline"
          >
            이용약관
          </Link>
          {/* 스크롤 시 컴팩트 CTA 등장 */}
          <button
            type="button"
            onClick={handleGet}
            className={`rounded-full bg-(--color-primary) px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-(--color-primary-strong) ${
              scrolled
                ? 'translate-x-0 opacity-100'
                : 'pointer-events-none translate-x-2 opacity-0'
            }`}
          >
            받기
          </button>
        </nav>
      </div>
    </header>
  );
}

/** 공통 푸터 — 법적 링크·문의처·저작권. */
export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-(--color-line)">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-5 py-8 text-sm text-(--color-ink-soft) sm:px-6">
        <nav className="flex flex-wrap gap-x-4 gap-y-2">
          <Link href="/privacy" className="hover:text-(--color-ink)">
            개인정보처리방침
          </Link>
          <Link href="/terms" className="hover:text-(--color-ink)">
            이용약관
          </Link>
          <Link href="/en/privacy" className="hover:text-(--color-ink)">
            Privacy Policy
          </Link>
          <Link href="/en/terms" className="hover:text-(--color-ink)">
            Terms of Service
          </Link>
        </nav>
        <p>
          문의:{' '}
          <a className="underline underline-offset-2" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>
        </p>
        <p>
          © 2026 {OPERATOR_NAME}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
