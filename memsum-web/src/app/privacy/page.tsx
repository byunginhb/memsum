import { LegalPage } from '@/components/LegalPage';
import { buildPageMetadata } from '@/lib/seo';

import type { Metadata } from 'next';

const TITLE = '개인정보처리방침';
const DESCRIPTION =
  'Memsum 개인정보처리방침 — 처리 항목·목적·보관·이용자 권리 안내.';

/** canonical·한영 hreflang·문서 전용 OG(랜딩 OG 문구가 상속되지 않게)를 함께 선언한다. */
export const metadata: Metadata = buildPageMetadata({
  lang: 'ko',
  paths: { ko: '/privacy', en: '/en/privacy' },
  title: TITLE,
  description: DESCRIPTION,
  ogTitle: `${TITLE} | Memsum`,
  ogDescription: DESCRIPTION,
  ogImageAlt: `${TITLE} | Memsum`,
});

export default function PrivacyPage() {
  return <LegalPage contentFile="privacy.ko.md" />;
}
