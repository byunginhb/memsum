import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';

import { getLandingCopy } from '@/lib/landing-copy';
import { GOOGLE_SITE_VERIFICATION, SITE_NAME, SITE_URL } from '@/lib/site';

import './globals.css';

// 시각·날짜·개수·머리표 전용 mono(라틴/숫자). 한글은 Wanted Sans가 맡는다.
const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500'],
  variable: '--font-jetbrains',
  display: 'swap',
});

// landing-copy.ts를 SSOT로 삼아 메타데이터를 동기화한다.
const koMeta = getLandingCopy('ko').meta;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: koMeta.titleDefault,
    template: koMeta.titleTemplate,
  },
  description: koMeta.description,
  verification: { google: GOOGLE_SITE_VERIFICATION },
  // hreflang — 한/영 페이지를 상호 대안으로 선언. x-default는 한국어(기본 도메인 루트).
  alternates: {
    languages: {
      ko: SITE_URL,
      en: `${SITE_URL}/en`,
      'x-default': SITE_URL,
    },
  },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: koMeta.ogTitle,
    description: koMeta.ogDescription,
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={mono.variable}>
      <head>
        {/* 폰트 CDN 선연결 — 렌더 블로킹 CSS의 핸드셰이크 시간을 줄인다. */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        {/* Wanted Sans Variable — 앱과 같은 서체. 유니코드 구간별로 잘린 woff2라 쓰는 글자만 받는다. */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/wanteddev/wanted-sans@v1.0.3/packages/wanted-sans/fonts/webfonts/variable/split/WantedSansVariable.min.css"
        />
      </head>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
