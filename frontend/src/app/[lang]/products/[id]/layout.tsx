import type { Metadata } from 'next';
import { serverFetch, SITE_URL } from '@/lib/server-api';
import { productJsonLd } from '@/lib/product-jsonld';

// Метаданные карточки товара. Сама страница клиентская (`'use client'`) и
// объявить metadata внутри неё нельзя — поэтому серверный layout рядом:
// поисковики и превью ссылок получают заголовок, описание и картинку,
// а рендер страницы не меняется.

interface Product {
  id: string;
  name: string;
  nameUz?: string | null;
  description?: string;
  descriptionUz?: string | null;
  manufacturer?: string;
  images?: string[];
  price?: number;
  minPrice?: number | null;
  inStock?: boolean;
}

// Картинки товаров лежат либо в /public фронтенда, либо отдаются API —
// в обоих случаях превью нужен абсолютный URL.
function absolute(url?: string): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

export async function generateMetadata(
  props: {
    params: Promise<{ id: string; lang: string }>;
  }
): Promise<Metadata> {
  const params = await props.params;
  const uz = params.lang === 'uz';
  const raw = await serverFetch<Product>(`/products/${params.id}`);
  const product = raw && localize(raw, uz);
  // API недоступен (холодный старт Render) — отдаём базовые метаданные,
  // страница при этом работает как обычно.
  if (!product?.name) return {};

  const price = product.minPrice ?? product.price;
  const fmt = price ? Math.round(price).toLocaleString('ru-RU') : '';
  const priceText = price ? (uz ? `${fmt} soʻmdan · ` : `от ${fmt} сум · `) : '';
  const description =
    `${priceText}${product.manufacturer ? `${product.manufacturer}. ` : ''}` +
    (product.description?.slice(0, 160) ??
      (uz ? 'VetHub — veterinariya preparatlarini ulgurji yetkazib berish.' : 'Оптовые поставки ветеринарных препаратов на VetHub.'));

  const image = absolute(product.images?.[0]) ?? `${SITE_URL}/icon-512.png`;
  const ru = `${SITE_URL}/products/${product.id}`;
  const url = uz ? `${SITE_URL}/uz/products/${product.id}` : ru;

  return {
    title: product.name,
    description,
    alternates: { canonical: url, languages: { ru, uz: `${SITE_URL}/uz/products/${product.id}`, 'x-default': ru } },
    openGraph: {
      type: 'website',
      title: `${product.name} — VetHub`,
      description,
      url,
      images: [{ url: image, alt: product.name }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.name} — VetHub`,
      description,
      images: [image],
    },
  };
}

// Название и описание — на языке страницы (узбекские, если продавец их задал).
function localize(p: Product, uz: boolean): Product {
  return uz ? { ...p, name: p.nameUz || p.name, description: p.descriptionUz || p.description } : p;
}

export default async function ProductLayout(props: { children: React.ReactNode; params: Promise<{ id: string; lang: string }> }) {
  const { id, lang } = await props.params;
  const raw = await serverFetch<Product>(`/products/${id}`);
  const product = raw && { ...localize(raw, lang === 'uz'), lang };
  return (
    <>
      {product?.name && (
        <script
          type="application/ld+json"
          // «<» экранируется: текст описания не должен закрыть тег script.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd(product)).replace(/</g, '\\u003c') }}
        />
      )}
      {props.children}
    </>
  );
}
