import type { MetadataRoute } from 'next';
import { serverFetch, SITE_URL } from '@/lib/server-api';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = ['', '/catalog', '/promotions', '/suppliers', '/blog', '/consult'].map((p) => ({
    url: `${SITE_URL}${p}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
  }));

  const data = await serverFetch<{ posts: { slug: string; createdAt: string }[] }>('/blog?limit=200');
  const posts = (data?.posts ?? []).map((p) => ({
    url: `${SITE_URL}/blog/${p.slug}`,
    lastModified: new Date(p.createdAt),
    changeFrequency: 'monthly' as const,
  }));

  return [...staticRoutes, ...posts];
}
