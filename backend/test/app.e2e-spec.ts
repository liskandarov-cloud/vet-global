// End-to-end API tests — run against the live server (docker compose up).
// Uses global fetch (Node 20); no in-process bootstrap, so it exercises the
// real running stack. Base URL via API_URL env (defaults to localhost).

const BASE = process.env.API_URL ?? 'http://localhost:8000/api';

interface Res {
  status: number;
  body: any;
}

async function req(
  path: string,
  opts: { method?: string; token?: string; body?: any } = {},
): Promise<Res> {
  const res = await fetch(BASE + path, {
    method: opts.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
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

// Пароль админа берётся из окружения: seed больше не задаёт «admin123»
// по умолчанию (иначе прод получал бы админа с паролем из репозитория).
const ADMIN_PW = process.env.ADMIN_PASSWORD ?? 'admin123';

describe('VetGlobal API (e2e)', () => {
  let buyer: string;
  let seller: string;
  let admin: string;

  beforeAll(async () => {
    buyer = await login('buyer@vetglobal.com', 'buyer123');
    seller = await login('seller@vetglobal.com', 'seller123');
    admin = await login('admin@vetglobal.com', ADMIN_PW);
  });

  it('health check responds ok', async () => {
    const r = await req('/health');
    expect(r.status).toBe(200);
    expect(r.body.status).toBe('ok');
  });

  it('seeds at least 7 categories', async () => {
    const r = await req('/categories');
    expect(r.status).toBe(200);
    expect(r.body.length).toBeGreaterThanOrEqual(7);
  });

  it('lists products with a total and array', async () => {
    const r = await req('/products?limit=5');
    expect(r.status).toBe(200);
    expect(r.body.total).toBeGreaterThan(0);
    expect(Array.isArray(r.body.products)).toBe(true);
  });

  it('paginates products (skip changes the page)', async () => {
    const p1 = await req('/products?skip=0&limit=3');
    const p2 = await req('/products?skip=3&limit=3');
    expect(p1.body.products[0].id).not.toBe(p2.body.products[0]?.id);
  });

  it('logs in the three demo roles', () => {
    expect(buyer).toBeTruthy();
    expect(seller).toBeTruthy();
    expect(admin).toBeTruthy();
  });

  it('rejects bad credentials with 401', async () => {
    const r = await req('/auth/login', { method: 'POST', body: { email: 'buyer@vetglobal.com', password: 'wrong' } });
    expect(r.status).toBe(401);
  });

  it('registers a new user', async () => {
    const email = `e2e+${Date.now()}@vg.test`;
    const r = await req('/auth/register', {
      method: 'POST',
      body: { email, password: 'secret123', fullName: 'E2E User', phone: '+998900000000', role: 'BUYER' },
    });
    expect(r.status).toBe(201);
    expect(r.body.token).toBeTruthy();
    expect(r.body.user.email).toBe(email);
  });

  it('enforces role-based access (buyer cannot read admin stats)', async () => {
    expect((await req('/admin/stats', { token: buyer })).status).toBe(403);
    expect((await req('/admin/stats')).status).toBe(401);
    expect((await req('/admin/stats', { token: admin })).status).toBe(200);
  });

  it('creates an order with commission and earned VetPoints', async () => {
    const products = (await req('/products?limit=50')).body.products;
    const p = products[0];
    const r = await req('/orders', {
      method: 'POST',
      token: buyer,
      body: { items: [{ productId: p.id, quantity: p.minOrder }] },
    });
    expect(r.status).toBe(201);
    expect(r.body.id).toBeTruthy();
    expect(r.body.commission).toBeGreaterThan(0);
    expect(r.body.vetPointsEarned).toBeGreaterThan(0);
    // Цена заказа обязана совпадать с ценой на витрине: если у товара есть
    // предложения продавцов, показывается minPrice (лучшее из них) — его и
    // должен платить покупатель. Раньше заказ без offerId считался по
    // product.price, и списывалось не то, что видел покупатель.
    const shownUnitPrice = p.minPrice ?? p.price;
    expect(r.body.total).toBe(shownUnitPrice * p.minOrder);
  });

  it('never grants ADMIN through public registration', async () => {
    const r = await req('/auth/register', {
      method: 'POST',
      body: {
        email: `escalation-${Date.now()}@example.com`,
        password: 'StrongPass123',
        fullName: 'Escalation Probe',
        phone: '+998900000000',
        role: 'ADMIN',
      },
    });
    expect(r.status).toBe(400);
    expect(r.body.token).toBeUndefined();
  });

  it('rejects an order below minimum quantity', async () => {
    const p = (await req('/products?limit=50')).body.products.find((x: any) => x.minOrder > 1);
    if (!p) return;
    const r = await req('/orders', { method: 'POST', token: buyer, body: { items: [{ productId: p.id, quantity: 1 }] } });
    expect(r.status).toBe(400);
  });

  it('adds and removes a favorite', async () => {
    const p = (await req('/products?limit=1')).body.products[0];
    await req('/favorites', { method: 'POST', token: buyer, body: { productId: p.id } });
    let ids = (await req('/favorites/ids', { token: buyer })).body;
    expect(ids).toContain(p.id);
    await req(`/favorites/${p.id}`, { method: 'DELETE', token: buyer });
    ids = (await req('/favorites/ids', { token: buyer })).body;
    expect(ids).not.toContain(p.id);
  });

  it('returns admin billing with rows and totals', async () => {
    const r = await req('/admin/billing', { token: admin });
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body.rows)).toBe(true);
    expect(r.body.totals.revenue).toBeGreaterThan(0);
    // payout = revenue - commission for every row
    for (const row of r.body.rows) {
      expect(row.payout).toBe(row.revenue - row.commission);
    }
  });

  it('exposes public promotions as an array', async () => {
    const r = await req('/promotions');
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body)).toBe(true);
  });
});
