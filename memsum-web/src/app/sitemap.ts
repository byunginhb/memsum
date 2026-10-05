import { languageAlternates, type LocalizedPath } from '@/lib/seo';
import { SITE_URL } from '@/lib/site';

import type { MetadataRoute } from 'next';

/**
 * 사이트맵 — 한·영 짝마다 두 URL을 싣고, 각 항목에 hreflang 대안(xhtml:link)을 함께 단다.
 * lastModified는 실제 내용이 바뀐 날짜로 관리한다(빌드 시각을 쓰면 매 배포마다 바뀌어 신호가 흐려진다).
 * 랜딩·정책 문서를 수정하면 아래 날짜도 함께 갱신할 것.
 */
const LANDING_UPDATED = new Date('2026-10-04');
const LEGAL_UPDATED = new Date('2026-06-28');

type Group = {
  paths: LocalizedPath;
  lastModified: Date;
  changeFrequency: 'weekly' | 'yearly';
  priority: number;
};

const GROUPS: readonly Group[] = [
  { paths: { ko: '', en: '/en' }, lastModified: LANDING_UPDATED, changeFrequency: 'weekly', priority: 1 },
  { paths: { ko: '/privacy', en: '/en/privacy' }, lastModified: LEGAL_UPDATED, changeFrequency: 'yearly', priority: 0.5 },
  { paths: { ko: '/terms', en: '/en/terms' }, lastModified: LEGAL_UPDATED, changeFrequency: 'yearly', priority: 0.5 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return GROUPS.flatMap(({ paths, ...rest }) => {
    // seo.ts의 absoluteUrl은 루트를 '/'로 받으므로 빈 문자열을 변환해 넘긴다.
    const localized = { ko: paths.ko || '/', en: paths.en };
    const languages = languageAlternates(localized);
    return [paths.ko, paths.en].map((path) => ({
      url: `${SITE_URL}${path}`,
      ...rest,
      alternates: { languages },
    }));
  });
}
