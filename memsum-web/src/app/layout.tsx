import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';

import { getLandingCopy } from '@/lib/landing-copy';
import {
  GOOGLE_SITE_VERIFICATION,
  NAVER_SITE_VERIFICATION,
  SITE_NAME,
  SITE_URL,
} from '@/lib/site';

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
  verification: {
    google: GOOGLE_SITE_VERIFICATION,
    // 토큰이 생기기 전에는 빈 메타를 내보내지 않는다.
    ...(NAVER_SITE_VERIFICATION
      ? { other: { 'naver-site-verification': NAVER_SITE_VERIFICATION } }
      : {}),
  },
  // canonical·hreflang은 레이아웃에 두지 않는다 — 상속되면 404 등 다른 페이지가 랜딩의
  // hreflang을 잘못 달게 된다. 각 page.tsx가 src/lib/seo.ts의 buildPageMetadata로 선언한다.
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: koMeta.ogTitle,
    description: koMeta.ogDescription,
    locale: 'ko_KR',
    images: [{ url: '/og.png', width: 1200, height: 630 }],
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
