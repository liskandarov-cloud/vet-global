import type { MetadataRoute } from 'next';
import { serverFetch, SITE_URL } from '@/lib/server-api';

export const revalidate = 3600; // обновлять карту сайта раз в час

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = ['', '/catalog', '/promotions', '/suppliers', '/brands', '/rfq', '/blog', '/consult', '/financing'].map((p) => ({
    url: `${SITE_URL}${p}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
  }));

  // Динамические URL (устойчиво к недоступности API — при null просто пропускаем).
  const [blog, products, brands] = await Promise.all([
    serverFetch<{ posts: { slug: string; createdAt: string }[] }>('/blog?limit=200').catch(() => null),
    serverFetch<{ products: { id: string; updatedAt?: string }[] }>('/products?limit=200').catch(() => null),
    serverFetch<{ slug: string }[]>('/brands').catch(() => null),
  ]);

  const posts = (blog?.posts ?? []).map((p) => ({
    url: `${SITE_URL}/blog/${p.slug}`,
    lastModified: new Date(p.createdAt),
    changeFrequency: 'monthly' as const,
  }));
  const productUrls = (products?.products ?? []).map((p) => ({
    url: `${SITE_URL}/products/${p.id}`,
    lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
    changeFrequency: 'weekly' as const,
  }));
  const brandUrls = (Array.isArray(brands) ? brands : []).map((b) => ({
    url: `${SITE_URL}/brands/${b.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
  }));

  return [...staticRoutes, ...productUrls, ...brandUrls, ...posts];
}
