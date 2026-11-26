// Одновременные запросы: одно решение, один заказ — против живого стека.
//
// Проверка состояния шла до записи, а запись была безусловной: двойное
// нажатие проходило проверку дважды.
export {};

const BASE = process.env.API_URL ?? 'http://localhost:8000/api';
const ADMIN_PW = process.env.ADMIN_PASSWORD ?? 'admin123';

async function req(path: string, opts: { method?: string; token?: string; body?: unknown } = {}) {
  const res = await fetch(BASE + path, {
    method: opts.method ?? (opts.body ? 'POST' : 'GET'),
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
  (await req('/auth/login', { body: { email, password } })).body.token as string;

describe('одновременные запросы', () => {
  const stamp = Date.now();

  // Одобрить и отклонить сразу: заявка оставалась отклонённой, а лимит выдан.
  it('кредитная заявка: одно решение, лимит соответствует ему', async () => {
    const admin = await login('admin@vetglobal.com', ADMIN_PW);
    const reg = await req('/auth/register', {
      body: { email: `race-${stamp}@vg.test`, password: 'secret123', fullName: 'E2E', phone: '+998900000000', role: 'BUYER', acceptTerms: true },
    });
    const buyer = reg.body.token as string;
    const app = await req('/financing/apply', { token: buyer, body: { requestedLimit: 1_000_000 } });
    expect(app.status).toBe(201);

    const decide = (approve: boolean) => req(`/financing/${app.body.id}/decide`, { token: admin, body: { approve } });
    const results = await Promise.all([decide(true), decide(false)]);
    expect(results.filter((r) => r.status < 300)).toHaveLength(1);

    const me = (await req('/financing/me', { token: buyer })).body;
    const status = results.find((r) => r.status < 300)!.body.status;
    expect(Number(me.creditLimit)).toBe(status === 'APPROVED' ? 1_000_000 : 0);
  });

  // «Заказать сейчас» дважды: создавалось два заказа.
  it('подписка: двойное «заказать сейчас» — один заказ', async () => {
    const buyer = await login('buyer@vetglobal.com', 'buyer123');
    // С ценой: товар «по запросу» (цена 0) заказать нельзя, а тесты идут в одной базе.
    const product = (await req('/products?limit=1&priceMin=1')).body.products[0];
    const sub = await req('/subscriptions', {
      token: buyer,
      body: { productId: product.id, quantity: product.offerMinOrder ?? product.minOrder ?? 1, intervalDays: 30 },
    });
    expect(sub.status).toBe(201);
    const run = () => req(`/subscriptions/${sub.body.id}/run`, { token: buyer, body: {} });
    const results = await Promise.all([run(), run(), run()]);
    expect(results.every((r) => r.status < 300)).toBe(true);
    expect(results.filter((r) => r.body.orderId).length).toBe(1);
  });
});
