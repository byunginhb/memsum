import type { Metadata } from 'next';

import type { Lang } from '@/lib/landing-copy';
import { SITE_NAME, SITE_URL } from '@/lib/site';

/**
 * 페이지별 메타데이터 공통 도우미.
 *
 * why: Next.js 메타데이터는 최상위 키 단위로 덮어쓴다. 페이지가 `alternates`나 `openGraph`를
 * 일부만 정의하면 레이아웃의 값(hreflang·OG 이미지)이 통째로 사라지므로, 페이지마다 완전한 묶음을
 * 이 함수로 만들어 빠짐없이 넣는다.
 */

/** 한국어·영어 짝 경로. ko는 접두사 없음, en은 `/en` 접두사. */
export type LocalizedPath = { ko: string; en: string };

export const OG_LOCALE: Record<Lang, string> = { ko: 'ko_KR', en: 'en_US' };

const OG_IMAGE: Record<Lang, string> = { ko: '/og.png', en: '/og.en.png' };
const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;

/** 경로를 절대 URL로. 루트('/')는 끝 슬래시 없이 도메인만 쓴다(사이트맵·hreflang과 일치). */
export function absoluteUrl(path: string): string {
  return path === '/' ? SITE_URL : `${SITE_URL}${path}`;
}

/** 한·영 상호 hreflang + x-default(한국어 기본 도메인). */
export function languageAlternates(paths: LocalizedPath): Record<string, string> {
  return {
    ko: absoluteUrl(paths.ko),
    en: absoluteUrl(paths.en),
    'x-default': absoluteUrl(paths.ko),
  };
}

type PageMetaInput = {
  lang: Lang;
  paths: LocalizedPath;
  /** 문서 제목. `absoluteTitle`이면 레이아웃 템플릿("%s | Memsum")을 붙이지 않는다. */
  title: string;
  absoluteTitle?: boolean;
  description: string;
  ogTitle: string;
  ogDescription: string;
  /** OG 이미지 대체 텍스트 — 별도 문구를 만들지 않도록 OG 제목을 그대로 넘긴다. */
  ogImageAlt: string;
};

export function buildPageMetadata(input: PageMetaInput): Metadata {
  const { lang, paths } = input;
  const url = absoluteUrl(paths[lang]);
  const otherLang: Lang = lang === 'ko' ? 'en' : 'ko';
  const image = { url: OG_IMAGE[lang], ...OG_IMAGE_SIZE, alt: input.ogImageAlt };

  return {
    title: input.absoluteTitle ? { absolute: input.title } : input.title,
    description: input.description,
    alternates: {
      canonical: url,
      languages: languageAlternates(paths),
    },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      locale: OG_LOCALE[lang],
      alternateLocale: [OG_LOCALE[otherLang]],
      url,
      title: input.ogTitle,
      description: input.ogDescription,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title: input.ogTitle,
      description: input.ogDescription,
      images: [image],
    },
  };
}
