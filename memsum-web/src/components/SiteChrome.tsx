import Link from 'next/link';

import { DotsLogo } from '@/components/DotsLogo';
import { OPERATOR_NAME, SUPPORT_EMAIL } from '@/lib/site';

/** 공통 상단 바 — 로고 + 워드마크(홈 링크). */
export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-5">
      <Link href="/" className="flex items-center gap-2.5">
        <DotsLogo size={32} />
        <span className="text-lg font-bold tracking-tight">Memsum</span>
      </Link>
      <nav className="flex items-center gap-4 text-sm text-(--color-ink-soft)">
        <Link href="/privacy" className="hover:text-(--color-ink)">
          개인정보처리방침
        </Link>
        <Link href="/terms" className="hover:text-(--color-ink)">
          이용약관
        </Link>
      </nav>
    </header>
  );
}

/** 공통 푸터 — 법적 링크·문의처·저작권. */
export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-(--color-line)">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-5 py-8 text-sm text-(--color-ink-soft)">
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
