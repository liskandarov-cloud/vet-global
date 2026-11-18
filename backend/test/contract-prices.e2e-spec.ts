// Договорные цены — против живого стека.
//
// Продавец назначает покупателю персональную цену на своё предложение. Это
// деньги в обе стороны: чужой покупатель не должен получить чужую скидку,
// продавец не должен назначить цену на чужое предложение, а просроченный
// договор — продолжать действовать. Юнит-тесты (common/pricing.spec.ts) проверяют
// формулу; здесь — что заказ действительно считается по ней и только для того,
// кому цена назначена.
//
// Продавцы и покупатели заводятся заново на каждый прогон: договорные цены
// демо-аккаунтов меняют другие наборы.

// Файл — модуль, а не скрипт: иначе BASE, req и login конфликтуют с
// одноимёнными объявлениями app.e2e-spec.ts при проверке типов тестов.
export {};

const BASE = process.env.API_URL ?? 'http://localhost:8000/api';
const ADMIN_PW = process.env.ADMIN_PASSWORD ?? 'admin123';

async function req(path: string, opts: { method?: string; token?: string; body?: any } = {}) {
  const res = await fetch(BASE + path, {
    method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'),
    headers: {
      'Content-Type': 'application/json',
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
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
  (await req('/auth/login', { body: { email, password } })).body.token as string;

interface Account {
  token: string;
  id: string;
  email: string;
}

const register = async (email: string, role: 'BUYER' | 'SELLER' = 'BUYER'): Promise<Account> => {
  const r = await req('/auth/register', {
    body: { email, password: 'secret123', fullName: 'E2E', phone: '+998900000000', role, acceptTerms: true },
  });
  expect(r.status).toBe(201);
  return { token: r.body.token, id: r.body.user.id, email };
};

describe('Договорные цены', () => {
  const stamp = Date.now();
  let seller: Account;
  let otherSeller: Account;
  let client: Account; // покупатель с договором
  let stranger: Account; // покупатель без договора
  let productId: string;
  let offerId: string;

  // Предложение продавца — 1000 за штуку, без объёмных скидок и акций.
  const orderTotal = async (token: string, quantity = 2, explicitOffer = false) => {
    const item = explicitOffer ? { productId, offerId, quantity } : { productId, quantity };
    const r = await req('/orders', { token, body: { items: [item] } });
    expect(r.status).toBe(201);
    return r.body.total as number;
  };
  const setContract = (token: string, body: Record<string, unknown>) => req('/contract-prices', { token, body });

  beforeAll(async () => {
    const admin = await login('admin@vetglobal.com', ADMIN_PW);
    seller = await register(`cp-seller-${stamp}@vg.test`, 'SELLER');
    otherSeller = await register(`cp-seller2-${stamp}@vg.test`, 'SELLER');
    for (const s of [seller, otherSeller]) {
      const v = await req(`/admin/users/${s.id}/verify`, { method: 'PATCH', token: admin, body: { isVerified: true } });
      expect(v.status).toBe(200);
    }
    client = await register(`cp-client-${stamp}@vg.test`);
    stranger = await register(`cp-stranger-${stamp}@vg.test`);

    const categoryId = (await req('/categories')).body[0].id;
    const p = await req('/products', {
      token: seller.token,
      body: { name: `Contract probe ${stamp}`, description: 'e2e', price: 1000, categoryId, manufacturer: `CP ${stamp}` },
    });
    expect(p.status).toBe(201);
    productId = p.body.id;
    const o = await req('/offers', { token: seller.token, body: { productId, price: 1000 } });
    expect(o.status).toBe(201);
    offerId = o.body.id;
  });

  it('без договора покупатель платит цену предложения', async () => {
    expect(await orderTotal(client.token)).toBe(2000);
  });

  it('продавец не назначает цену на чужое предложение', async () => {
    const r = await setContract(otherSeller.token, { offerId, buyerEmail: client.email, price: 1 });
    expect(r.status).toBe(403);
    expect(await orderTotal(client.token)).toBe(2000);
  });

  it('цена для незарегистрированной почты не назначается', async () => {
    const r = await setContract(seller.token, { offerId, buyerEmail: `nobody-${stamp}@vg.test`, price: 500 });
    expect(r.status).toBe(404);
  });

  it('договорная цена действует для своего покупателя — и только для него', async () => {
    const r = await setContract(seller.token, { offerId, buyerEmail: client.email, price: 700 });
    expect(r.status).toBe(201);

    expect(await orderTotal(client.token)).toBe(1400);
    // Явно выбранное предложение считается так же, как подобранное каталогом.
    expect(await orderTotal(client.token, 2, true)).toBe(1400);
    expect(await orderTotal(stranger.token)).toBe(2000);

    const mine = (await req(`/contract-prices/my?productId=${productId}`, { token: client.token })).body as any[];
    expect(mine).toEqual([expect.objectContaining({ offerId, productId, price: 700 })]);
    const theirs = (await req(`/contract-prices/my?productId=${productId}`, { token: stranger.token })).body as any[];
    expect(theirs).toEqual([]);
  });

  it('продавец видит свои договоры, чужие не видит и не удаляет', async () => {
    const own = (await req('/contract-prices/seller', { token: seller.token })).body as any[];
    const row = own.find((x) => x.offerId === offerId);
    expect(row).toBeTruthy();
    expect(row.buyer.email).toBe(client.email);

    const foreign = (await req('/contract-prices/seller', { token: otherSeller.token })).body as any[];
    expect(foreign.some((x) => x.id === row.id)).toBe(false);
    expect((await req(`/contract-prices/${row.id}`, { method: 'DELETE', token: otherSeller.token })).status).toBe(403);
    expect(await orderTotal(client.token)).toBe(1400);
  });

  // Договорная цена — потолок, а не обязательство: если публичная цена ниже,
  // покупатель с договором не должен платить больше остальных.
  it('договорная цена выше публичной не повышает сумму', async () => {
    expect((await setContract(seller.token, { offerId, buyerEmail: client.email, price: 1200 })).status).toBe(201);
    expect(await orderTotal(client.token)).toBe(2000);
  });

  it('просроченный договор не действует', async () => {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString();
    expect(
      (await setContract(seller.token, { offerId, buyerEmail: client.email, price: 500, validUntil: yesterday })).status,
    ).toBe(201);
    expect(await orderTotal(client.token)).toBe(2000);
    const mine = (await req(`/contract-prices/my?productId=${productId}`, { token: client.token })).body as any[];
    expect(mine).toEqual([]);
  });

  it('удалённый договор перестаёт действовать', async () => {
    expect((await setContract(seller.token, { offerId, buyerEmail: client.email, price: 600 })).status).toBe(201);
    expect(await orderTotal(client.token)).toBe(1200);

    const row = ((await req('/contract-prices/seller', { token: seller.token })).body as any[]).find(
      (x) => x.offerId === offerId,
    );
    expect((await req(`/contract-prices/${row.id}`, { method: 'DELETE', token: seller.token })).status).toBe(200);
    expect(await orderTotal(client.token)).toBe(2000);
  });
});
