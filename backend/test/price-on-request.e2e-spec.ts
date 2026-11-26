// Цена по запросу: товар с ценой 0 нельзя заказать, только запросить у поставщика.
//
// Без проверки заказ на такую позицию оформился бы на «0 сум» — товар бесплатно.
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

describe('цена по запросу', () => {
  it('заказ не оформляется, запрос поставщику уходит', async () => {
    const stamp = Date.now();
    const admin = await login('admin@vetglobal.com', ADMIN_PW);
    const r = await req('/auth/register', {
      method: 'POST',
      body: { email: `onrequest-${stamp}@vg.test`, password: 'secret123', fullName: 'E2E', phone: '+998900000000', role: 'SELLER', company: `OnRequest ${stamp}`, acceptTerms: true },
    });
    const seller = r.body.token;
    await req(`/admin/users/${r.body.user.id}/verify`, { method: 'PATCH', token: admin, body: { isVerified: true } });
    const categoryId = (await req('/categories')).body[0].id;
    const name = `On request ${stamp}`;
    const productId = (await req('/products', { method: 'POST', token: seller, body: { name, description: 'e2e', price: 0, categoryId, inStock: false } })).body.id;
    expect((await req('/offers', { method: 'POST', token: seller, body: { productId, price: 0, inStock: false } })).status).toBeLessThan(300);

    const buyer = await login('buyer@vetglobal.com', 'buyer123');
    const order = await req('/orders', { method: 'POST', token: buyer, body: { items: [{ productId, quantity: 1 }] } });
    expect([order.status, order.body.message]).toEqual([400, `Цена «${name}» — по запросу: отправьте запрос поставщику на странице товара`]);

    const lead = await req('/leads', { method: 'POST', body: { fullName: 'E2E', phone: '+998901112233', productId, quantity: 5 } });
    expect(lead.status).toBe(201);
    expect(lead.body.sellerId).toBe(r.body.user.id);

    // Продавец видит заявку у себя и отмечает статус; чужой продавец — нет.
    const mine = await req('/leads/mine', { token: seller });
    expect(mine.body.map((l: { id: string }) => l.id)).toContain(lead.body.id);
    expect((await req(`/leads/mine/${lead.body.id}`, { method: 'PATCH', token: seller, body: { status: 'CONTACTED' } })).status).toBe(200);
    const other = await login('seller@vetglobal.com', 'seller123');
    const foreign = await req(`/leads/mine/${lead.body.id}`, { method: 'PATCH', token: other, body: { status: 'CLOSED' } });
    expect([foreign.status, foreign.body.message]).toEqual([404, 'Заявка не найдена']);
  });
});
