import type { Metadata } from 'next';

import { GOOGLE_SITE_VERIFICATION, SITE_NAME, SITE_URL } from '@/lib/site';

import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} 멤섬 — 스크린샷 정리·캘린더 자동·주간 요약`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    '쌓인 스크린샷을 자동으로 읽어 정리하고, 일정은 캘린더에, 한 주는 5줄 요약으로. 가입 없이 바로 시작, 광고 없음.',
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
    title: '찍기만 하세요. Memsum이 알아서.',
    description:
      '쌓인 스크린샷을 자동으로 읽어 정리하고, 일정은 캘린더에, 한 주는 5줄 요약으로. 가입 없이 바로 시작, 광고 없음.',
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
