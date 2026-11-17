import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/server-api';

export default function robots(): MetadataRoute.Robots {
  // Демо-стенд с вымышленными данными в поиск попадать не должен.
  if (process.env.NEXT_PUBLIC_DEMO === 'true') return { rules: { userAgent: '*', disallow: '/' } };
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
