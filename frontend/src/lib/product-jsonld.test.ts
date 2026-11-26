import { describe, it, expect } from 'vitest';
import { productJsonLd } from './product-jsonld';

describe('разметка товара для поисковиков', () => {
  it('цена, валюта, наличие и бренд', () => {
    const j: any = productJsonLd({ id: 'p1', name: 'Кеносан', price: 340000, inStock: true, manufacturer: 'CID Lines', images: ['https://api.vethub.uz/api/files/1'] });
    expect(j.offers).toMatchObject({ priceCurrency: 'UZS', price: 340000, availability: 'https://schema.org/InStock' });
    expect(j.brand).toEqual({ '@type': 'Brand', name: 'CID Lines' });
    expect(j.image).toEqual(['https://api.vethub.uz/api/files/1']);
  });

  it('под заказ — PreOrder; цена по запросу — без предложения', () => {
    expect((productJsonLd({ id: 'p2', name: 'Эксакон', price: 180000, inStock: false }) as any).offers.availability).toBe('https://schema.org/PreOrder');
    expect(productJsonLd({ id: 'p3', name: 'Тилобаг', price: 0 })).not.toHaveProperty('offers');
  });
});
