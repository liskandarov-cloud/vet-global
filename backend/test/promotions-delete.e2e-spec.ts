// Удаление товара не превращает его акцию в акцию на весь ассортимент.
//
// Акция без товара — скидка на все товары продавца (bestPromotionPercent), а
// связь акции с товаром была ON DELETE SET NULL: удалили товар — его скидка
// легла на весь ассортимент, и покупатели платили меньше за всё.

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

describe('удаление товара с акцией', () => {
  const stamp = Date.now();
  let seller: string;
  let buyer: string;
  let keptId: string;
  let promoId: string;

  const unitPrice = async (productId: string) => {
    const r = await req('/orders', { method: 'POST', token: buyer, body: { items: [{ productId, quantity: 1 }] } });
    expect(r.status).toBe(201);
    return Number(r.body.items[0].price);
  };

  beforeAll(async () => {
    seller = await login('seller@vetglobal.com', 'seller123');
    buyer = await login('buyer@vetglobal.com', 'buyer123');
    const categoryId = (await req('/categories')).body[0].id;
    const make = async (name: string) =>
      (await req('/products', { method: 'POST', token: seller, body: { name, description: 'e2e', price: 1000, categoryId } })).body.id as string;
    const doomedId = await make(`Promo doomed ${stamp}`);
    keptId = await make(`Promo kept ${stamp}`);
    const p = await req('/promotions', {
      method: 'POST',
      token: seller,
      body: { title: `Promo ${stamp}`, productId: doomedId, discountPercent: 30 },
    });
    expect(p.status).toBe(201);
    promoId = p.body.id;
    expect(await unitPrice(keptId)).toBe(1000);
    expect((await req(`/products/${doomedId}`, { method: 'DELETE', token: seller })).status).toBe(200);
  });

  it('скидка удалённого товара не ложится на остальные', async () => {
    expect(await unitPrice(keptId)).toBe(1000);
  });

  it('акция удалена вместе с товаром', async () => {
    const mine = (await req('/promotions/mine', { token: seller })).body as { id: string }[];
    expect(mine.some((x) => x.id === promoId)).toBe(false);
  });
});
