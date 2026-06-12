import type { Metadata } from 'next';

import { GOOGLE_SITE_VERIFICATION, SITE_NAME, SITE_URL } from '@/lib/site';

import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — 스크린샷을 기억으로`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    '스크린샷, 찍기만 하세요. Memsum이 자동으로 정리하고, 날짜가 보이면 캘린더에 등록하고, 일요일 저녁 5줄 리포트로 알려드려요.',
  verification: { google: GOOGLE_SITE_VERIFICATION },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: `${SITE_NAME} — 스크린샷을 기억으로`,
    description:
      '스크린샷을 자동으로 정리하고 캘린더에 등록하고 주간 리포트로 알려주는 앱.',
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
    <html lang="ko">
      <head>
        {/* 폰트 CDN 선연결 — 렌더 블로킹 CSS의 핸드셰이크 시간을 줄인다. */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        {/* Pretendard Variable — 앱과 동일 서체(가변·동적 서브셋) */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
