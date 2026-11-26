import type { MetadataRoute } from 'next';
import { serverFetch, SITE_URL } from '@/lib/server-api';

export const revalidate = 3600; // обновлять карту сайта раз в час

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = ['', '/catalog', '/promotions', '/suppliers', '/brands', '/rfq', '/blog', '/consult', '/financing', '/legal/terms', '/legal/privacy', '/legal/sellers'].map((p) => ({
    url: `${SITE_URL}${p}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
  }));

  // Динамические URL (устойчиво к недоступности API — при null просто пропускаем).
  const [blog, products, brands, sellers] = await Promise.all([
    serverFetch<{ posts: { slug: string; createdAt: string }[] }>('/blog?limit=200').catch(() => null),
    serverFetch<{ products: { id: string; updatedAt?: string }[] }>('/products?limit=200').catch(() => null),
    serverFetch<{ slug: string }[]>('/brands').catch(() => null),
    serverFetch<{ id: string }[] | { sellers: { id: string }[] }>('/sellers').catch(() => null),
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

  // Страницы поставщиков: по названию компании ищут не реже, чем по товару.
  const sellerList = Array.isArray(sellers) ? sellers : (sellers?.sellers ?? []);
  const sellerUrls = sellerList.map((s) => ({
    url: `${SITE_URL}/suppliers/${s.id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
  }));

  // Каждая страница — в двух языковых версиях со ссылками друг на друга
  // (hreflang): узбекская версия живёт по адресу /uz/….
  const both = (e: MetadataRoute.Sitemap[number]) => {
    const path = e.url.slice(SITE_URL.length);
    const ru = `${SITE_URL}${path}`;
    const uz = `${SITE_URL}/uz${path}`;
    const languages = { ru, uz };
    return [
      { ...e, url: ru, alternates: { languages } },
      { ...e, url: uz, alternates: { languages } },
    ];
  };
  return [...staticRoutes, ...productUrls, ...sellerUrls, ...brandUrls, ...posts].flatMap(both);
}
