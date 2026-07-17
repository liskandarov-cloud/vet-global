// E2E coverage for the broader feature set + payment protocols, against the
// live server. Payme/Click tests are conditional on their keys being present.
import { createHash } from 'crypto';

const BASE = process.env.API_URL ?? 'http://localhost:8000/api';

async function req(
  path: string,
  opts: { method?: string; token?: string; body?: any; headers?: Record<string, string>; form?: boolean } = {},
): Promise<{ status: number; body: any }> {
  const headers: Record<string, string> = { ...(opts.headers ?? {}) };
  let body: string | undefined;
  if (opts.body !== undefined) {
    if (opts.form) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      body = new URLSearchParams(opts.body).toString();
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(opts.body);
    }
  }
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  const res = await fetch(BASE + path, { method: opts.method ?? (opts.body ? 'POST' : 'GET'), headers, body });
  const text = await res.text();
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }
  return { status: res.status, body: parsed };
}

const login = async (email: string, password: string) =>
  (await req('/auth/login', { body: { email, password } })).body.token as string;

// Пароль админа берётся из окружения: seed больше не задаёт «admin123»
// по умолчанию (иначе прод получал бы админа с паролем из репозитория).
const ADMIN_PW = process.env.ADMIN_PASSWORD ?? 'admin123';

describe('VetGlobal integrations (e2e)', () => {
  let buyer: string;
  let seller: string;
  let admin: string;
  let sellerId: string;
  let sellerProduct: any;

  beforeAll(async () => {
    buyer = await login('buyer@vetglobal.com', 'buyer123');
    seller = await login('seller@vetglobal.com', 'seller123');
    admin = await login('admin@vetglobal.com', ADMIN_PW);
    sellerId = (await req('/auth/me', { token: seller })).body.id;
    sellerProduct = (await req(`/products?sellerId=${sellerId}&limit=1`)).body.products[0];
  });

  it('delivery: seller creates a shipment, buyer sees it', async () => {
    const order = (await req('/orders', {
      token: buyer,
      body: { items: [{ productId: sellerProduct.id, quantity: sellerProduct.minOrder }] },
    })).body;
    const ship = await req(`/orders/${order.id}/shipment`, {
      token: seller,
      body: { method: 'COURIER', city: 'Ташкент', carrier: 'BTS', trackingNumber: 'T1', cost: 40000 },
    });
    expect(ship.status).toBe(201);
    expect(ship.body.status).toBe('PENDING');
    const view = await req(`/orders/${order.id}/shipment`, { token: buyer });
    expect(view.body.carrier).toBe('BTS');
  });

  it('consulting: public submit → admin sees it', async () => {
    const topic = `E2E тест ${Date.now()}`;
    const c = await req('/consultations', { body: { fullName: 'Тест', phone: '+998900000001', topic, message: 'вопрос' } });
    expect(c.status).toBe(201);
    const list = (await req('/consultations', { token: admin })).body;
    expect(list.some((x: any) => x.topic === topic)).toBe(true);
  });

  it('1C sync: key + JSON price feed updates a product', async () => {
    const key = (await req('/sync/key', { token: seller })).body.syncApiKey;
    expect(key).toBeTruthy();
    const ext = `E2E-${Date.now()}`;
    await req(`/products/${sellerProduct.id}`, {
      method: 'PUT',
      token: seller,
      body: {
        name: sellerProduct.name,
        description: 'x',
        categoryId: sellerProduct.categoryId,
        price: sellerProduct.price,
        minOrder: sellerProduct.minOrder,
        externalId: ext,
      },
    });
    const res = await req('/sync/price', { headers: { 'X-Sync-Key': key }, body: { items: [{ externalId: ext, price: 123456, quantity: 0 }] } });
    expect(res.body.updated).toBe(1);
    const p = (await req(`/products/${sellerProduct.id}`)).body;
    expect(p.price).toBe(123456);
    expect(p.inStock).toBe(false);
    expect((await req('/sync/price', { headers: { 'X-Sync-Key': 'bad' }, body: { items: [] } })).status).toBe(401);
  });

  it('promotions: seller creates → appears in public list', async () => {
    const title = `E2E promo ${Date.now()}`;
    const created = await req('/promotions', { token: seller, body: { title, discountPercent: 10, isActive: true } });
    expect(created.status).toBe(201);
    const pub = (await req('/promotions')).body;
    expect(pub.some((x: any) => x.title === title)).toBe(true);
  });

  it('blog: admin draft is hidden, then published, then deleted', async () => {
    const title = `E2E post ${Date.now()}`;
    const created = (await req('/blog', { token: admin, body: { title, content: 'text', published: false } })).body;
    const publicHasDraft = (await req('/blog?limit=200')).body.posts.some((p: any) => p.id === created.id);
    expect(publicHasDraft).toBe(false);
    await req(`/blog/${created.id}`, { method: 'PATCH', token: admin, body: { published: true } });
    const publicHasPublished = (await req('/blog?limit=200')).body.posts.some((p: any) => p.id === created.id);
    expect(publicHasPublished).toBe(true);
    expect((await req(`/blog/${created.id}`, { method: 'DELETE', token: admin })).status).toBe(200);
  });

  it('counterparties: buyer adds one and orders on its behalf', async () => {
    const cp = (await req('/users/me/counterparties', {
      token: buyer,
      body: { name: `ЮрЛицо ${Date.now()}`, inn: '301000000', isDefault: false },
    })).body;
    const product = (await req('/products?limit=50')).body.products.find((p: any) => p.minOrder === 1);
    const order = (await req('/orders', {
      token: buyer,
      body: { items: [{ productId: product.id, quantity: 1 }], counterpartyId: cp.id },
    })).body;
    expect(order.counterpartyId).toBe(cp.id);
  });

  // ── Payment protocols (conditional on keys) ──
  const PAYME_KEY = process.env.PAYME_KEY;
  (PAYME_KEY ? it : it.skip)('payme: auth + CheckPerformTransaction', async () => {
    const product = (await req('/products?limit=50')).body.products.find((p: any) => p.minOrder === 1);
    const order = (await req('/orders', { token: buyer, body: { items: [{ productId: product.id, quantity: 1 }] } })).body;
    const authHeader = 'Basic ' + Buffer.from(`Paycom:${PAYME_KEY}`).toString('base64');
    const bad = await req('/payments/payme', { headers: { Authorization: 'Basic ' + Buffer.from('Paycom:wrong').toString('base64') }, body: { id: 1, method: 'CheckPerformTransaction', params: { amount: order.total * 100, account: { order_id: order.id } } } });
    expect(bad.body.error.code).toBe(-32504);
    const ok = await req('/payments/payme', { headers: { Authorization: authHeader }, body: { id: 1, method: 'CheckPerformTransaction', params: { amount: order.total * 100, account: { order_id: order.id } } } });
    expect(ok.body.result.allow).toBe(true);
    const wrongAmt = await req('/payments/payme', { headers: { Authorization: authHeader }, body: { id: 1, method: 'CheckPerformTransaction', params: { amount: 1, account: { order_id: order.id } } } });
    expect(wrongAmt.body.error.code).toBe(-31001);
  });

  const CLICK_SECRET = process.env.CLICK_SECRET_KEY;
  const CLICK_SERVICE = process.env.CLICK_SERVICE_ID ?? '12345';
  (CLICK_SECRET ? it : it.skip)('click: prepare accepts valid signature, rejects bad', async () => {
    const product = (await req('/products?limit=50')).body.products.find((p: any) => p.minOrder === 1);
    const order = (await req('/orders', { token: buyer, body: { items: [{ productId: product.id, quantity: 1 }] } })).body;
    const pay = (await req('/payments', { token: buyer, body: { orderId: order.id, provider: 'CLICK' } })).body;
    const ct = 'clk_' + Date.now();
    const st = '2026-07-04 08:00:00';
    const md5 = (s: string) => createHash('md5').update(s).digest('hex');
    const sign = md5(`${ct}${CLICK_SERVICE}${CLICK_SECRET}${pay.id}${order.total}0${st}`);
    const good = await req('/payments/click/prepare', { form: true, body: { click_trans_id: ct, service_id: CLICK_SERVICE, merchant_trans_id: pay.id, amount: order.total, action: 0, sign_time: st, sign_string: sign } });
    expect(good.body.error).toBe(0);
    const bad = await req('/payments/click/prepare', { form: true, body: { click_trans_id: ct, service_id: CLICK_SERVICE, merchant_trans_id: pay.id, amount: order.total, action: 0, sign_time: st, sign_string: 'bad' } });
    expect(bad.body.error).toBe(-1);
  });
});
