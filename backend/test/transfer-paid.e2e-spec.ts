// Оплата перечислением: продавец отмечает поступление по своему счёту.
//
// Платформа знала только онлайн-оплаты, а в B2B чаще платят по счёту на
// расчётный счёт: заказ выглядел неоплаченным, лимит отсрочки не
// освобождался, акт сверки показал бы оплаченное долгом.
export {};

const BASE = process.env.API_URL ?? 'http://localhost:8000/api';
const ADMIN_PW = process.env.ADMIN_PASSWORD ?? 'admin123';

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

describe('оплата перечислением', () => {
  const stamp = Date.now();
  let seller: string;
  let buyer: string;
  let productId: string;
  const used = async () => Number((await req('/financing/me', { token: buyer })).body.creditUsed);

  beforeAll(async () => {
    const admin = await login('admin@vetglobal.com', ADMIN_PW);
    const r = await req('/auth/register', {
      method: 'POST',
      body: { email: `transfer-${stamp}@vg.test`, password: 'secret123', fullName: 'E2E', phone: '+998900000000', role: 'SELLER', company: `Transfer ${stamp}`, acceptTerms: true },
    });
    seller = r.body.token;
    await req(`/admin/users/${r.body.user.id}/verify`, { method: 'PATCH', token: admin, body: { isVerified: true } });
    const categoryId = (await req('/categories')).body[0].id;
    productId = (await req('/products', { method: 'POST', token: seller, body: { name: `Transfer probe ${stamp}`, description: 'e2e', price: 1000, categoryId } })).body.id;
    await req('/offers', { method: 'POST', token: seller, body: { productId, price: 1000, inStock: true } });
    buyer = await login('buyer@vetglobal.com', 'buyer123');
  });

  it('продавец отмечает — лимит освобождён, сумма по счёту, второй раз нельзя', async () => {
    const before = await used();
    const order = await req('/orders', { method: 'POST', token: buyer, body: { items: [{ productId, quantity: 2 }], paymentTerm: 'NET_TERMS', netTermDays: 30 } });
    expect(order.status).toBe(201);
    expect(await used()).toBeCloseTo(before + Number(order.body.total), 2);

    const other = await login('seller@vetglobal.com', 'seller123');
    expect((await req(`/orders/${order.body.id}/transfer-paid`, { method: 'POST', token: other })).status).toBe(403);
    expect((await req(`/orders/${order.body.id}/transfer-paid`, { method: 'POST', token: buyer })).status).toBe(403);

    const paid = await req(`/orders/${order.body.id}/transfer-paid`, { method: 'POST', token: seller, body: {} });
    expect(paid.status).toBe(201);
    expect(paid.body.transferPayments).toHaveLength(1);
    expect(paid.body.transferPayments[0].amount).toBeCloseTo(Number(order.body.total), 2);
    expect(await used()).toBeCloseTo(before, 2);

    const again = await req(`/orders/${order.body.id}/transfer-paid`, { method: 'POST', token: seller, body: {} });
    expect([again.status, again.body.message]).toEqual([400, 'Оплата уже отмечена']);

    const seen = await req(`/orders/${order.body.id}`, { token: buyer });
    expect(seen.body.transferPayments[0].amount).toBeCloseTo(Number(order.body.total), 2);
  });
});
