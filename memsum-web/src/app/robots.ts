import { SITE_URL } from '@/lib/site';

import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    // /api/ 는 알림 신청 POST 엔드포인트뿐이라 색인할 내용이 없다.
    rules: { userAgent: '*', allow: '/', disallow: '/api/' },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
