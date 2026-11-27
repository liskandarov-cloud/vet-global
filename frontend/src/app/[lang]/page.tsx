import { serverFetch } from '@/lib/server-api';
import type { Category, Product } from '@/lib/types';
import HomeView, { type HomeData, type Post, type Seller } from './HomeView';

// Серверная обёртка главной: те же запросы, что делала страница в браузере,
// но один раз на пересборку (serverFetch кэширует ответы), а не у каждого
// посетителя. Без категорий считаем, что API не ответил, — тогда страница
// запросит данные сама.
export default async function HomePage() {
  const [categories, promos, verified, posts, all, sellers, brands] = await Promise.all([
    serverFetch<Category[]>('/categories'),
    serverFetch<{ products: Product[] }>('/products?discounted=true&limit=4'),
    serverFetch<Seller[]>('/sellers?verifiedOnly=true'),
    serverFetch<{ posts: Post[] }>('/blog?limit=3'),
    serverFetch<{ total: number }>('/products?limit=1'),
    serverFetch<Seller[]>('/sellers'),
    serverFetch<unknown[]>('/brands'),
  ]);
  const initial: HomeData | undefined = Array.isArray(categories)
    ? {
        categories,
        promos: promos?.products ?? [],
        sellers: (Array.isArray(verified) ? verified : []).slice(0, 3),
        posts: posts?.posts ?? [],
        stats: {
          products: all?.total ?? 0,
          sellers: Array.isArray(sellers) ? sellers.length : 0,
          brands: Array.isArray(brands) ? brands.length : 0,
        },
      }
    : undefined;
  return <HomeView initial={initial} />;
}
