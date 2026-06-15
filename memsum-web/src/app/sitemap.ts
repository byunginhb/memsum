import { SITE_URL } from '@/lib/site';

import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date('2026-06-12');
  // 랜딩(ko='', en='/en')은 priority 1·weekly, 정책 페이지는 0.5·yearly.
  const landing = ['', '/en'];
  return ['', '/en', '/privacy', '/terms', '/en/privacy', '/en/terms'].map(
    (path) => {
      const isLanding = landing.includes(path);
      return {
        url: `${SITE_URL}${path}`,
        lastModified,
        changeFrequency: isLanding ? 'weekly' : 'yearly',
        priority: isLanding ? 1 : 0.5,
      };
    },
  );
}
