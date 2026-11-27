import { flatDescription } from './product-facts';
import { SITE_URL } from './server-api';

export interface JsonLdProduct {
  id: string;
  name: string;
  description?: string;
  manufacturer?: string;
  images?: string[];
  price?: number;
  minPrice?: number | null;
  inStock?: boolean;
  lang?: string;
}

function absolute(url?: string): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

// Разметка schema.org/Product: по ней поисковики показывают в выдаче цену,
// наличие и фото товара. Цена «по запросу» (0) — без предложения: цену в
// разметке называть нельзя, а «0 сум» ввёл бы в заблуждение.
export function productJsonLd(p: JsonLdProduct) {
  const price = p.minPrice ?? p.price ?? 0;
  const url = `${SITE_URL}${p.lang === 'uz' ? '/uz' : ''}/products/${p.id}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    sku: p.id,
    url,
    ...(p.description ? { description: flatDescription(p.description).slice(0, 500) } : {}),
    ...(p.images?.length ? { image: p.images.map(absolute).filter(Boolean) } : {}),
    ...(p.manufacturer ? { brand: { '@type': 'Brand', name: p.manufacturer } } : {}),
    ...(price > 0
      ? {
          offers: {
            '@type': 'Offer',
            url,
            priceCurrency: 'UZS',
            price: Math.round(price),
            availability: p.inStock === false ? 'https://schema.org/PreOrder' : 'https://schema.org/InStock',
          },
        }
      : {}),
  };
}

