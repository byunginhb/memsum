'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { BrandMark } from '@/components/brand/BrandMark';
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

/** 헤더가 배경·구분선을 얻는 스크롤 거리(px). */
const SCROLLED_AT = 40;

/** 수동 선택을 미들웨어가 존중하도록 NEXT_LOCALE 쿠키를 1년간 저장한다. */
function persistLocale(locale: Lang) {
  // SameSite=Lax: 일반 내비게이션에서 전송되어 미들웨어가 즉시 읽을 수 있다.
  document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=31536000;samesite=lax`;
}

/** 헤더 언어 토글 — 클릭 시 쿠키 저장 + 해당 로케일 페이지로 이동(미들웨어가 존중). */
function LangToggle({ copy }: { copy: LandingCopy }) {
  const t = copy.langToggle;
  const base =
    'relative py-1 text-[13px] font-semibold transition-colors after:absolute after:inset-x-0 after:-bottom-0.5 after:h-[2px] after:transition-colors';
  const active = 'text-ink after:bg-cobalt';
  const inactive = 'text-ink-2 hover:text-ink after:bg-transparent';

  return (
    <div role="group" aria-label={t.ariaLabel} className="flex items-center gap-3">
      <Link
        href="/"
        hrefLang="ko"
        lang="ko"
        onClick={() => persistLocale('ko')}
        aria-current={copy.isKorean ? 'true' : undefined}
        className={`${base} ${copy.isKorean ? active : inactive}`}
      >
        {t.ko}
      </Link>
      <span aria-hidden="true" className="h-3 w-px bg-rule-strong" />
      <Link
        href="/en"
        hrefLang="en"
        lang="en"
        onClick={() => persistLocale('en')}
        aria-current={copy.isKorean ? undefined : 'true'}
        className={`${base} ${copy.isKorean ? inactive : active}`}
      >
        {t.en}
      </Link>
    </div>
  );
}

/**
 * 공통 상단 바 — 브랜드 마크 + 워드마크(홈 링크) · 정책 링크 · 언어 토글.
 * 스크롤하면 종이색 바탕과 머리카락 구분선이 생기고 컴팩트 CTA("받기")가 나타난다.
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
        setScrolled(window.scrollY > SCROLLED_AT);
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
      lang={c.isKorean ? 'ko' : 'en'}
      className={`sticky top-0 z-40 border-b transition-colors duration-200 ${
        scrolled
          ? 'border-rule bg-paper/92 backdrop-blur-md'
          : 'border-transparent bg-paper/0'
      }`}
    >
      <div className="wrap flex h-16 items-center justify-between gap-4">
        <Link href={homeHref} className="flex items-center gap-2.5 rounded-sm">
          <BrandMark size={30} />
          <span className="text-[19px] font-black tracking-[-0.03em]">Memsum</span>
        </Link>
        <nav className="flex items-center gap-5 text-[13px] font-medium text-ink-2">
          <Link href={privacyHref} className="hidden hover:text-ink md:inline">
            {c.header.privacy}
          </Link>
          <Link href={termsHref} className="hidden hover:text-ink md:inline">
            {c.header.terms}
          </Link>
          <LangToggle copy={c} />
          {/* 스크롤 시 컴팩트 CTA 등장 */}
          <button
            type="button"
            onClick={handleGet}
            tabIndex={scrolled ? 0 : -1}
            aria-hidden={scrolled ? undefined : true}
            className={`press hidden h-9 rounded-full bg-cobalt px-4 text-[13px] font-bold text-white hover:bg-cobalt-strong sm:inline-block ${
              scrolled ? 'opacity-100' : 'pointer-events-none opacity-0'
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
  const linkClass = 'hover:text-ink underline-offset-4 hover:underline';

  return (
    <footer lang={c.isKorean ? 'ko' : 'en'} className="border-t border-rule">
      <div className="wrap grid gap-8 pt-10 pb-28 text-[13px] text-ink-2 sm:grid-cols-[auto_1fr] sm:items-start lg:pb-12">
        <div className="flex items-center gap-2.5 text-ink">
          <BrandMark size={24} />
          <span className="text-base font-black tracking-[-0.03em]">Memsum</span>
        </div>
        <div className="grid gap-3 sm:justify-items-end sm:text-right">
          <nav className="flex flex-wrap gap-x-5 gap-y-2 sm:justify-end">
            <Link href={privacyHref} className={linkClass}>
              {c.footer.privacy}
            </Link>
            <Link href={termsHref} className={linkClass}>
              {c.footer.terms}
            </Link>
            {/* 반대 로케일 정책 링크(영문 사용자도 한국어 정책 접근 가능 — 기존 동작 유지) */}
            {c.isKorean ? (
              <>
                <Link href="/en/privacy" lang="en" className={linkClass}>
                  {c.footer.privacyPolicy}
                </Link>
                <Link href="/en/terms" lang="en" className={linkClass}>
                  {c.footer.termsOfService}
                </Link>
              </>
            ) : null}
          </nav>
          <p>
            {c.footer.contact}{' '}
            <a className="t-mono text-ink underline underline-offset-4" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
          </p>
          <p className="t-mono text-[12px]">© 2026 {OPERATOR_NAME}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
