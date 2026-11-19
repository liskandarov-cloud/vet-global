// Цена из кабинета доходит до витрины и заказа — против живого стека.
//
// Витрина («от …») и заказ берут цену из предложения продавца, а кабинет
// менял только карточку: продавец видел новую цену, покупатель — прежнюю
// (так было с «БиоЭквин ФТ» 19.11.2026: в кабинете 340 000, в каталоге 330 000).

// Модуль, а не скрипт: иначе req и login конфликтуют с другими e2e при проверке типов.
export {};

const BASE = process.env.API_URL ?? 'http://localhost:8000/api';

async function req(path: string, opts: { method?: string; token?: string; body?: unknown } = {}) {
  const res = await fetch(BASE + path, {
    method: opts.method ?? 'GET',
    headers: { 'Content-Type': 'application/json', ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let body: any;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

const login = async (email: string, password: string) =>
  (await req('/auth/login', { method: 'POST', body: { email, password } })).body.token as string;

describe('цена из кабинета', () => {
  const stamp = Date.now();
  let seller: string;
  let productId: string;
  let offerId: string;
  let card: { name: string; description: string; categoryId: string };

  // Так сохраняет карточку кабинет продавца (seller/page.tsx).
  const save = (price: number, isActive = true) =>
    req(`/products/${productId}`, { method: 'PUT', token: seller, body: { ...card, price, isActive } });
  const shown = async () => (await req(`/products/${productId}`)).body;

  beforeAll(async () => {
    seller = await login('seller@vetglobal.com', 'seller123');
    const categoryId = (await req('/categories')).body[0].id;
    card = { name: `Price probe ${stamp}`, description: 'e2e', categoryId };
    const p = await req('/products', { method: 'POST', token: seller, body: { ...card, price: 1000 } });
    expect(p.status).toBe(201);
    productId = p.body.id;
    const o = await req('/offers', { method: 'POST', token: seller, body: { productId, price: 1000, inStock: true } });
    expect(o.status).toBe(201);
    offerId = o.body.id;
    expect(Number((await shown()).minPrice)).toBe(1000);
  });

  it('новая цена — и на витрине, и в предложении', async () => {
    expect((await save(1200)).status).toBe(200);
    const p = await shown();
    expect(Number(p.price)).toBe(1200);
    expect(Number(p.minPrice)).toBe(1200);
    const own = (p.offers as { id: string; price: unknown }[]).find((o) => o.id === offerId);
    expect(Number(own?.price)).toBe(1200);
  });

  // Цену можно задать и в самом предложении; сохранение карточки с прежней
  // ценой (переключатель «снять с продажи») не должно её затирать.
  it('сохранение без смены цены не трогает предложение', async () => {
    expect((await req(`/offers/${offerId}`, { method: 'PUT', token: seller, body: { price: 1100 } })).status).toBe(200);
    expect((await save(1200, false)).status).toBe(200);
    expect((await save(1200, true)).status).toBe(200);
    expect(Number((await shown()).minPrice)).toBe(1100);
  });
});
