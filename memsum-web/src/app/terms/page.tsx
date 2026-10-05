import { LegalPage } from '@/components/LegalPage';
import { buildPageMetadata } from '@/lib/seo';

import type { Metadata } from 'next';

const TITLE = '이용약관';
const DESCRIPTION =
  'Memsum 이용약관 — 서비스 내용·계정·콘텐츠 권리·책임 안내.';

/** canonical·한영 hreflang·문서 전용 OG(랜딩 OG 문구가 상속되지 않게)를 함께 선언한다. */
export const metadata: Metadata = buildPageMetadata({
  lang: 'ko',
  paths: { ko: '/terms', en: '/en/terms' },
  title: TITLE,
  description: DESCRIPTION,
  ogTitle: `${TITLE} | Memsum`,
  ogDescription: DESCRIPTION,
  ogImageAlt: `${TITLE} | Memsum`,
});

export default function TermsPage() {
  return <LegalPage contentFile="terms.ko.md" />;
}
