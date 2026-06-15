import { LandingPage } from '@/components/landing/LandingPage';
import { getLandingCopy } from '@/lib/landing-copy';
import { SITE_URL } from '@/lib/site';

import type { Metadata } from 'next';

const enCopy = getLandingCopy('en');

/** 영어 랜딩(`/en`) 메타데이터 — final.md §0의 영어 원문 그대로. */
export const metadata: Metadata = {
  title: {
    default: enCopy.meta.titleDefault,
    template: enCopy.meta.titleTemplate,
  },
  description: enCopy.meta.description,
  alternates: {
    canonical: '/en',
    languages: {
      ko: SITE_URL,
      en: `${SITE_URL}/en`,
      'x-default': SITE_URL,
    },
  },
  openGraph: {
    type: 'website',
    siteName: 'Memsum',
    title: enCopy.meta.ogTitle,
    description: enCopy.meta.ogDescription,
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
  },
};

/** 영어 랜딩(`/en`). */
export default function HomeEnPage() {
  return <LandingPage lang="en" />;
}
