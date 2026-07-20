import type { Metadata } from 'next';
import { serverFetch, SITE_URL } from '@/lib/server-api';

// Метаданные карточки товара. Сама страница клиентская (`'use client'`) и
// объявить metadata внутри неё нельзя — поэтому серверный layout рядом:
// поисковики и превью ссылок получают заголовок, описание и картинку,
// а рендер страницы не меняется.

interface Product {
  id: string;
  name: string;
  description?: string;
  manufacturer?: string;
  images?: string[];
  price?: number;
  minPrice?: number | null;
}

// Картинки товаров лежат либо в /public фронтенда, либо отдаются API —
// в обоих случаях превью нужен абсолютный URL.
function absolute(url?: string): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const product = await serverFetch<Product>(`/products/${params.id}`);
  // API недоступен (холодный старт Render) — отдаём базовые метаданные,
  // страница при этом работает как обычно.
  if (!product?.name) return {};

  const price = product.minPrice ?? product.price;
  const priceText = price ? `от ${Math.round(price).toLocaleString('ru-RU')} сум · ` : '';
  const description =
    `${priceText}${product.manufacturer ? `${product.manufacturer}. ` : ''}` +
    (product.description?.slice(0, 160) ?? 'Оптовые поставки ветеринарных препаратов на VetGlobal.');

  const image = absolute(product.images?.[0]) ?? `${SITE_URL}/icon-512.png`;
  const url = `${SITE_URL}/products/${product.id}`;

  return {
    title: product.name,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      title: `${product.name} — VetGlobal`,
      description,
      url,
      images: [{ url: image, alt: product.name }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.name} — VetGlobal`,
      description,
      images: [image],
    },
  };
}

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
