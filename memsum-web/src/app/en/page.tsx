import { LandingPage } from '@/components/landing/LandingPage';
import { JsonLd } from '@/components/seo/JsonLd';
import { getLandingCopy } from '@/lib/landing-copy';
import { buildPageMetadata } from '@/lib/seo';
import { buildLandingJsonLd } from '@/lib/structured-data';

import type { Metadata } from 'next';

const enMeta = getLandingCopy('en').meta;

/**
 * 영어 랜딩(`/en`) 메타데이터 — final.md §0의 영어 원문 그대로.
 * absoluteTitle: 레이아웃 템플릿이 붙어 "… | Memsum"이 중복되던 문제를 막는다.
 */
export const metadata: Metadata = buildPageMetadata({
  lang: 'en',
  paths: { ko: '/', en: '/en' },
  title: enMeta.titleDefault,
  absoluteTitle: true,
  description: enMeta.description,
  ogTitle: enMeta.ogTitle,
  ogDescription: enMeta.ogDescription,
  ogImageAlt: enMeta.ogTitle,
});

/** 영어 랜딩(`/en`). */
export default function HomeEnPage() {
  return (
    <>
      <LandingPage lang="en" />
      <JsonLd data={buildLandingJsonLd('en')} />
    </>
  );
}
