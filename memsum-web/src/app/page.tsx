import { LandingPage } from '@/components/landing/LandingPage';
import { JsonLd } from '@/components/seo/JsonLd';
import { getLandingCopy } from '@/lib/landing-copy';
import { buildPageMetadata } from '@/lib/seo';
import { buildLandingJsonLd } from '@/lib/structured-data';

import type { Metadata } from 'next';

const koMeta = getLandingCopy('ko').meta;

/** 한국어 랜딩(`/`) 메타데이터 — 문구는 landing-copy.ts 원문 그대로, canonical·hreflang·OG URL을 명시. */
export const metadata: Metadata = buildPageMetadata({
  lang: 'ko',
  paths: { ko: '/', en: '/en' },
  title: koMeta.titleDefault,
  absoluteTitle: true,
  description: koMeta.description,
  ogTitle: koMeta.ogTitle,
  ogDescription: koMeta.ogDescription,
  ogImageAlt: koMeta.ogTitle,
});

/** 한국어 랜딩(`/`). */
export default function HomePage() {
  return (
    <>
      <LandingPage lang="ko" />
      <JsonLd data={buildLandingJsonLd('ko')} />
    </>
  );
}
