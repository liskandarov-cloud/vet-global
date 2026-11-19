import { describe, it, expect } from 'vitest';
import { edgeCachePolicy, FILE_TTL, JSON_TTL } from './edge-cache';

const API = 'https://api.vethub.uz';
const h = (init: Record<string, string> = {}) => new Headers(init);
const SITE = { origin: 'https://vethub.uz' };

describe('кэш на краю перед API', () => {
  it('файлы — на год, ключ без параметров и источника', () => {
    const p = edgeCachePolicy('GET', `${API}/api/files/3f2b8c1e-9a4d-4e7f-b2c5-1a2b3c4d5e6f?r=1`, h(SITE));
    expect(p).toEqual({ key: `${API}/api/files/3f2b8c1e-9a4d-4e7f-b2c5-1a2b3c4d5e6f`, ttl: FILE_TTL, browserCacheControl: null });
  });

  it('публичный каталог — на минуту, источник в ключе, браузеру не кэшировать', () => {
    const p = edgeCachePolicy('GET', `${API}/api/products?limit=12&sort=newest`, h(SITE));
    expect(p?.ttl).toBe(JSON_TTL);
    expect(p?.browserCacheControl).toBe('no-store');
    expect(p?.key).toBe(`${API}/api/products?limit=12&sort=newest&__edge_origin=https%3A%2F%2Fvethub.uz`);
    expect(edgeCachePolicy('GET', `${API}/api/categories`, h(SITE))?.key).toBe(
      `${API}/api/categories?__edge_origin=https%3A%2F%2Fvethub.uz`,
    );
    for (const path of ['/api/products/facets', '/api/products/abc', '/api/sellers/s1', '/api/brands/bioveta', '/api/blog', '/api/reviews?productId=p1', '/api/promotions']) {
      expect(edgeCachePolicy('GET', `${API}${path}`, h(SITE))).not.toBeNull();
    }
  });

  // Ответ без CORS-заголовка не должен достаться витрине из общего кэша.
  it('запросы с разным Origin не делят запись', () => {
    const site = edgeCachePolicy('GET', `${API}/api/categories`, h(SITE))!;
    const bare = edgeCachePolicy('GET', `${API}/api/categories`, h())!;
    expect(site.key).not.toBe(bare.key);
  });

  it('с токеном, с cookie и не-GET — мимо кэша', () => {
    expect(edgeCachePolicy('GET', `${API}/api/products`, h({ ...SITE, authorization: 'Bearer x' }))).toBeNull();
    expect(edgeCachePolicy('GET', `${API}/api/products`, h({ ...SITE, cookie: 'a=b' }))).toBeNull();
    expect(edgeCachePolicy('POST', `${API}/api/products/p1/notify-me`, h(SITE))).toBeNull();
    expect(edgeCachePolicy('HEAD', `${API}/api/files/x`, h())).toBeNull();
  });

  it('всё прочее — мимо кэша, даже похожее', () => {
    for (const path of ['/api/health', '/api/auth/login', '/api/orders', '/api/contract-prices/my', '/api/productsx', '/api/payments/payme', '/api/seller-documents/1/file']) {
      expect(edgeCachePolicy('GET', `${API}${path}`, h(SITE))).toBeNull();
    }
  });
});
