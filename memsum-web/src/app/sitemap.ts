import { SITE_URL } from '@/lib/site';

import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date('2026-06-12');
  return ['', '/privacy', '/terms', '/en/privacy', '/en/terms'].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency: path === '' ? 'weekly' : 'yearly',
    priority: path === '' ? 1 : 0.5,
  }));
}
