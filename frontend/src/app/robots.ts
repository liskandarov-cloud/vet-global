import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/server-api';

export default function robots(): MetadataRoute.Robots {
  // Демо-стенд с вымышленными данными в поиск попадать не должен.
  if (process.env.NEXT_PUBLIC_DEMO === 'true') return { rules: { userAgent: '*', disallow: '/' } };
  return {
    // Кабинеты закрыты входом, но в выдаче им всё равно делать нечего.
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/seller', '/dashboard', '/org', '/cart', '/uz/admin', '/uz/seller', '/uz/dashboard', '/uz/org', '/uz/cart'] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
