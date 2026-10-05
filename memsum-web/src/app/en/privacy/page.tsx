import { LegalPage } from '@/components/LegalPage';
import { buildPageMetadata } from '@/lib/seo';

import type { Metadata } from 'next';

const TITLE = 'Privacy Policy';
const DESCRIPTION =
  'Memsum Privacy Policy — what we process, why, retention, and your rights.';

/** canonical·한영 hreflang·문서 전용 OG(랜딩 OG 문구가 상속되지 않게)를 함께 선언한다. */
export const metadata: Metadata = buildPageMetadata({
  lang: 'en',
  paths: { ko: '/privacy', en: '/en/privacy' },
  title: TITLE,
  description: DESCRIPTION,
  ogTitle: `${TITLE} | Memsum`,
  ogDescription: DESCRIPTION,
  ogImageAlt: `${TITLE} | Memsum`,
});

export default function PrivacyEnPage() {
  return <LegalPage contentFile="privacy.en.md" lang="en" />;
}
