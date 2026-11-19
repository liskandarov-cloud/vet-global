// Резерв кредитного лимита следует за суммой заказа — против живого стека.
//
// Под отсрочку лимит занимается при оформлении на сумму заказа, а
// освобождается оплатой или отменой по текущей сумме. Продавец без тарифа
// назначает доставку позже, сумма растёт — и резерв обязан вырасти вместе с
// ней: иначе до оплаты покупатель набирал бы заказов сверх лимита, а отмена
// возвращала бы в лимит больше, чем было занято.
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

describe('резерв лимита под отсрочку', () => {
  const stamp = Date.now();
  let seller: string;
  let buyer: string;
  let productId: string;
  const used = async () => Number((await req('/financing/me', { token: buyer })).body.creditUsed);

  beforeAll(async () => {
    const admin = await login('admin@vetglobal.com', ADMIN_PW);
    // Свой продавец: без тарифов доставки, стоимость назначается отправкой.
    const r = await req('/auth/register', {
      method: 'POST',
      body: { email: `credit-${stamp}@vg.test`, password: 'secret123', fullName: 'E2E', phone: '+998900000000', role: 'SELLER', company: `Credit ${stamp}`, acceptTerms: true },
    });
    seller = r.body.token;
    expect((await req(`/admin/users/${r.body.user.id}/verify`, { method: 'PATCH', token: admin, body: { isVerified: true } })).status).toBe(200);
    const categoryId = (await req('/categories')).body[0].id;
    productId = (await req('/products', { method: 'POST', token: seller, body: { name: `Credit probe ${stamp}`, description: 'e2e', price: 1000, categoryId } })).body.id;
    await req('/offers', { method: 'POST', token: seller, body: { productId, price: 1000, inStock: true } });
    buyer = await login('buyer@vetglobal.com', 'buyer123');
  });

  it('доставка увеличивает резерв, отмена возвращает ровно занятое', async () => {
    const before = await used();
    const order = await req('/orders', {
      method: 'POST',
      token: buyer,
      body: { items: [{ productId, quantity: 1 }], paymentTerm: 'NET_TERMS', netTermDays: 30 },
    });
    expect(order.status).toBe(201);
    expect(await used()).toBeCloseTo(before + Number(order.body.total), 2);

    const sh = await req(`/orders/${order.body.id}/shipments`, { method: 'POST', token: seller, body: { method: 'COURIER', cost: 45000 } });
    expect(sh.status).toBeLessThan(300);
    const total = Number((await req(`/orders/${order.body.id}`, { token: buyer })).body.total);
    expect(total).toBeCloseTo(Number(order.body.total) + 45000, 2);
    expect(await used()).toBeCloseTo(before + total, 2);

    expect((await req(`/orders/${order.body.id}/status`, { method: 'PATCH', token: seller, body: { status: 'CANCELLED' } })).status).toBe(200);
    expect(await used()).toBeCloseTo(before, 2);
  });
});
