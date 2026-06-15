'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { DotsLogo } from '@/components/DotsLogo';
import { useOptionalNotify } from '@/components/landing/NotifyProvider';
import { getLandingCopy, type Lang, type LandingCopy } from '@/lib/landing-copy';
import { OPERATOR_NAME, SUPPORT_EMAIL } from '@/lib/site';

/** 로케일별 카피를 해석. 미지정 시 한국어(법적 페이지 기본값). */
function resolveCopy(lang: Lang, copy?: LandingCopy): LandingCopy {
  return copy ?? getLandingCopy(lang);
}

type ChromeProps = {
  /** 현재 로케일. 기본 'ko'(법적 페이지 등 비랜딩 경로). */
  lang?: Lang;
  /** 명시 카피(랜딩에서 주입). 없으면 lang으로 해석. */
  copy?: LandingCopy;
};

/** 수동 선택을 미들웨어가 존중하도록 NEXT_LOCALE 쿠키를 1년간 저장한다. */
function persistLocale(locale: Lang) {
  // SameSite=Lax: 일반 내비게이션에서 전송되어 미들웨어가 즉시 읽을 수 있다.
  document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=31536000;samesite=lax`;
}

/** 헤더 언어 토글 — 클릭 시 쿠키 저장 + 해당 로케일 페이지로 이동(미들웨어가 존중). */
function LangToggle({ copy }: { copy: LandingCopy }) {
  const t = copy.langToggle;
  const linkBase =
    'rounded-full px-2.5 py-1 text-xs font-semibold transition-colors';
  const active = 'bg-(--color-primary) text-white';
  const inactive = 'text-(--color-ink-soft) hover:text-(--color-ink)';

  return (
    <div
      role="group"
      aria-label={t.ariaLabel}
      className="flex items-center gap-1 rounded-full bg-(--color-primary-soft) p-0.5"
    >
      <Link
        href="/"
        hrefLang="ko"
        onClick={() => persistLocale('ko')}
        aria-current={copy.isKorean ? 'true' : undefined}
        className={`${linkBase} ${copy.isKorean ? active : inactive}`}
      >
        {t.ko}
      </Link>
      <Link
        href="/en"
        hrefLang="en"
        onClick={() => persistLocale('en')}
        aria-current={copy.isKorean ? undefined : 'true'}
        className={`${linkBase} ${copy.isKorean ? inactive : active}`}
      >
        {t.en}
      </Link>
    </div>
  );
}

/**
 * 공통 상단 바 — 로고 + 워드마크(홈 링크) + 언어 토글.
 * 스크롤 40px↓: backdrop-blur + cream 90% 배경 + 하단 line + 컴팩트 CTA("받기") 등장(§3.6).
 */
export function SiteHeader({ lang = 'ko', copy }: ChromeProps) {
  const c = resolveCopy(lang, copy);
  const [scrolled, setScrolled] = useState(false);
  const notify = useOptionalNotify();

  // 프로바이더가 있으면 모달, 없으면(법적 페이지) mailto 폴백(로케일 제목).
  const handleGet = () => {
    if (notify) {
      notify.openNotify();
      return;
    }
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
      c.notifyDialog.mailtoSubject,
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

  // 홈 링크는 현재 로케일의 랜딩(ko='/', en='/en')으로 향한다.
  const homeHref = c.isKorean ? '/' : '/en';
  const privacyHref = c.isKorean ? '/privacy' : '/en/privacy';
  const termsHref = c.isKorean ? '/terms' : '/en/terms';

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-200 ease-(--ease-standard) ${
        scrolled
          ? 'border-b border-(--color-line) bg-(--color-cream)/90 shadow-(--shadow-card) backdrop-blur-md'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-6">
        <Link href={homeHref} className="flex items-center gap-2.5">
          <DotsLogo size={32} />
          <span className="text-lg font-bold tracking-tight">Memsum</span>
        </Link>
        <nav className="flex items-center gap-3 text-sm text-(--color-ink-soft) sm:gap-4">
          <Link
            href={privacyHref}
            className="hidden hover:text-(--color-ink) sm:inline"
          >
            {c.header.privacy}
          </Link>
          <Link
            href={termsHref}
            className="hidden hover:text-(--color-ink) sm:inline"
          >
            {c.header.terms}
          </Link>
          <LangToggle copy={c} />
          {/* 스크롤 시 컴팩트 CTA 등장 */}
          <button
            type="button"
            onClick={handleGet}
            className={`hidden rounded-full bg-(--color-primary) px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-(--color-primary-strong) sm:inline-block ${
              scrolled
                ? 'translate-x-0 opacity-100'
                : 'pointer-events-none translate-x-2 opacity-0'
            }`}
          >
            {c.header.getIt}
          </button>
        </nav>
      </div>
    </header>
  );
}

/** 공통 푸터 — 법적 링크·문의처·저작권. */
export function SiteFooter({ lang = 'ko', copy }: ChromeProps) {
  const c = resolveCopy(lang, copy);
  // 법적 링크는 현재 로케일 우선. 다른 로케일 정책 링크도 함께 노출(접근성·SEO).
  const privacyHref = c.isKorean ? '/privacy' : '/en/privacy';
  const termsHref = c.isKorean ? '/terms' : '/en/terms';

  return (
    <footer className="mt-20 border-t border-(--color-line)">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-5 py-8 text-sm text-(--color-ink-soft) sm:px-6">
        <nav className="flex flex-wrap gap-x-4 gap-y-2">
          <Link href={privacyHref} className="hover:text-(--color-ink)">
            {c.footer.privacy}
          </Link>
          <Link href={termsHref} className="hover:text-(--color-ink)">
            {c.footer.terms}
          </Link>
          {/* 반대 로케일 정책 링크(영문 사용자도 한국어 정책 접근 가능 — 기존 동작 유지) */}
          {c.isKorean ? (
            <>
              <Link href="/en/privacy" className="hover:text-(--color-ink)">
                {c.footer.privacyPolicy}
              </Link>
              <Link href="/en/terms" className="hover:text-(--color-ink)">
                {c.footer.termsOfService}
              </Link>
            </>
          ) : null}
        </nav>
        <p>
          {c.footer.contact}{' '}
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
