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

// Наличие владельца живёт в его предложении: «под заказ», записанное только в
// карточку, затиралось следующим пересчётом (смена цены, правка предложения),
// товар с нулевым остатком снова был «в наличии», и заказ шёл без подтверждения.
describe('наличие из кабинета и после заказа', () => {
  const stamp = Date.now();
  let seller: string;
  let buyer: string;
  let productId: string;
  let offerId: string;
  let card: { name: string; description: string; categoryId: string };

  const save = (body: Record<string, unknown>) =>
    req(`/products/${productId}`, { method: 'PUT', token: seller, body: { ...card, price: 1000, ...body } });
  const inStock = async () => (await req(`/products/${productId}`)).body.inStock as boolean;

  beforeAll(async () => {
    seller = await login('seller@vetglobal.com', 'seller123');
    buyer = await login('buyer@vetglobal.com', 'buyer123');
    const categoryId = (await req('/categories')).body[0].id;
    card = { name: `Stock probe ${stamp}`, description: 'e2e', categoryId };
    const p = await req('/products', { method: 'POST', token: seller, body: { ...card, price: 1000 } });
    productId = p.body.id;
    const o = await req('/offers', { method: 'POST', token: seller, body: { productId, price: 1000, inStock: true } });
    offerId = o.body.id;
  });

  it('остаток 0 в кабинете — «под заказ», и смена цены этого не отменяет', async () => {
    expect((await save({ stockQty: 0 })).status).toBe(200);
    expect(await inStock()).toBe(false);
    expect((await save({ stockQty: 0, price: 1300 })).status).toBe(200);
    expect(await inStock()).toBe(false);
    const order = await req('/orders', { method: 'POST', token: buyer, body: { items: [{ productId, quantity: 1 }] } });
    expect(order.status).toBe(201);
    expect(order.body.requiresConfirmation).toBe(true);
  });

  it('заказ выбрал остаток — правка предложения не возвращает «в наличии»', async () => {
    expect((await save({ stockQty: 2 })).status).toBe(200);
    expect(await inStock()).toBe(true);
    const order = await req('/orders', { method: 'POST', token: buyer, body: { items: [{ productId, quantity: 2 }] } });
    expect(order.status).toBe(201);
    expect(order.body.requiresConfirmation).toBe(false);
    expect(await inStock()).toBe(false);
    // Любая правка предложения пересчитывает агрегаты карточки.
    expect((await req(`/offers/${offerId}`, { method: 'PUT', token: seller, body: { minOrder: 1 } })).status).toBe(200);
    expect(await inStock()).toBe(false);
  });
});
