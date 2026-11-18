// Проверки по итогам аудита безопасности 18.11.2026 — против запущенного
// сервера, как остальные e2e. Каждая проверка воспроизводит конкретный способ
// злоупотребления: до исправления она проходила у атакующего.
import { createHash } from 'crypto';

const BASE = process.env.API_URL ?? 'http://localhost:8000/api';
const ADMIN_PW = process.env.ADMIN_PASSWORD ?? 'admin123';
const CLICK_SECRET = process.env.CLICK_SECRET_KEY;
const CLICK_SERVICE = process.env.CLICK_SERVICE_ID ?? '';

async function req(
  path: string,
  opts: { method?: string; token?: string; body?: any; form?: boolean } = {},
): Promise<{ status: number; body: any }> {
  const headers: Record<string, string> = {};
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

const uniq = () => `${Date.now()}${Math.floor(Math.random() * 1e6)}`;

async function registerBuyer(): Promise<{ token: string; email: string; id: string }> {
  const email = `sec-${uniq()}@example.com`;
  const r = await req('/auth/register', {
    body: { email, password: 'secret123', fullName: 'Аудит Покупатель', phone: '+998900001122', role: 'BUYER', acceptTerms: true },
  });
  expect(r.status).toBe(201);
  return { token: r.body.token, email, id: r.body.user.id };
}

describe('аудит безопасности (e2e)', () => {
  let buyer: string;
  let seller: string;
  let admin: string;
  let product: any;

  beforeAll(async () => {
    buyer = await login('buyer@vetglobal.com', 'buyer123');
    seller = await login('seller@vetglobal.com', 'seller123');
    admin = await login('admin@vetglobal.com', ADMIN_PW);
    const sellerId = (await req('/auth/me', { token: seller })).body.id;
    const any = (await req(`/products?sellerId=${sellerId}&limit=1`)).body.products[0];
    // Свой товар без учёта остатка и без предложений: цена известна точно
    // (100 000 за штуку), склад не мешает параллельным заказам.
    product = (await req('/products', {
      token: seller,
      body: { name: `zz-sec-${uniq()}`, description: 'x', categoryId: any.categoryId, price: 100000, minOrder: 1, inStock: true },
    })).body;
    expect(product.id).toBeTruthy();
  });

  // Товар снимается с витрины: другие наборы берут «первый товар продавца»,
  // и свежий тестовый товар без предложений сбивал бы их.
  afterAll(async () => {
    await req(`/products/${product.id}`, {
      method: 'PUT',
      token: seller,
      body: { name: product.name, description: 'x', categoryId: product.categoryId, price: 100000, minOrder: 1, isActive: false },
    });
  });

  const order = (token: string, body: any = {}) =>
    req('/orders', { token, body: { items: [{ productId: product.id, quantity: 1 }], ...body } });

  // ── Платежи ──
  describe('платёж по заказу — только покупатель заказа или администратор', () => {
    it('продавец не подтверждает оплату чужого заказа и не видит платёж', async () => {
      const o = (await order(buyer)).body;
      const pay = (await req('/payments', { token: buyer, body: { orderId: o.id, provider: 'PAYME' } })).body;
      expect(pay.id).toBeTruthy();

      // Позиции продавца в заказе есть — раньше этого хватало.
      expect((await req(`/payments/${pay.id}/mock-confirm`, { token: seller, body: {} })).status).toBe(403);
      expect((await req(`/payments/${pay.id}/status`, { token: seller })).status).toBe(403);
      expect((await req(`/orders/${o.id}`, { token: buyer })).body.status).toBe('PENDING');
    });

    it('продавец не создаёт платёж по чужому заказу', async () => {
      const o = (await order(buyer)).body;
      expect((await req('/payments', { token: seller, body: { orderId: o.id, provider: 'CLICK' } })).status).toBe(403);
    });

    it('оплата не возвращает к жизни отменённый заказ', async () => {
      const o = (await order(buyer)).body;
      const pay = (await req('/payments', { token: buyer, body: { orderId: o.id, provider: 'PAYME' } })).body;
      await req(`/orders/${o.id}/status`, { method: 'PATCH', token: admin, body: { status: 'CANCELLED' } });
      await req(`/payments/${pay.id}/mock-confirm`, { token: buyer, body: {} });
      expect((await req(`/orders/${o.id}`, { token: buyer })).body.status).toBe('CANCELLED');
    });
  });

  // ── Click ──
  const md5 = (s: string) => createHash('md5').update(s).digest('hex');
  const clickComplete = (payId: string, amount: number | string, prepareId: string, clickTrans: string) => {
    const st = '2026-11-18 10:00:00';
    const sign = md5(`${clickTrans}${CLICK_SERVICE}${CLICK_SECRET}${payId}${prepareId}${amount}1${st}`);
    return req('/payments/click/complete', {
      form: true,
      body: {
        click_trans_id: clickTrans, service_id: CLICK_SERVICE, merchant_trans_id: payId,
        merchant_prepare_id: prepareId, amount, action: 1, sign_time: st, sign_string: sign, error: 0,
      },
    });
  };
  const clickPrepare = (payId: string, amount: number | string, clickTrans: string) => {
    const st = '2026-11-18 10:00:00';
    const sign = md5(`${clickTrans}${CLICK_SERVICE}${CLICK_SECRET}${payId}${amount}0${st}`);
    return req('/payments/click/prepare', {
      form: true,
      body: { click_trans_id: clickTrans, service_id: CLICK_SERVICE, merchant_trans_id: payId, amount, action: 0, sign_time: st, sign_string: sign },
    });
  };

  (CLICK_SECRET ? describe : describe.skip)('Click: завершение сверяется с подготовкой и суммой', () => {
    it('завершение без подготовки оплату не проводит', async () => {
      const o = (await order(buyer)).body;
      const pay = (await req('/payments', { token: buyer, body: { orderId: o.id, provider: 'CLICK' } })).body;
      const r = await clickComplete(pay.id, o.total, pay.id, uniq());
      expect(r.body.error).toBe(-6);
      expect((await req(`/orders/${o.id}`, { token: buyer })).body.status).toBe('PENDING');
    });

    it('завершение на другую сумму оплату не проводит', async () => {
      const o = (await order(buyer)).body;
      const pay = (await req('/payments', { token: buyer, body: { orderId: o.id, provider: 'CLICK' } })).body;
      const ct = uniq();
      expect((await clickPrepare(pay.id, o.total, ct)).body.error).toBe(0);
      const r = await clickComplete(pay.id, 1, pay.id, ct);
      expect(r.body.error).toBe(-2);
      expect((await req(`/orders/${o.id}`, { token: buyer })).body.status).toBe('PENDING');
    });

    it('честная пара prepare → complete проводит оплату', async () => {
      const o = (await order(buyer)).body;
      const pay = (await req('/payments', { token: buyer, body: { orderId: o.id, provider: 'CLICK' } })).body;
      const ct = uniq();
      expect((await clickPrepare(pay.id, o.total, ct)).body.error).toBe(0);
      expect((await clickComplete(pay.id, o.total, pay.id, ct)).body.error).toBe(0);
      expect((await req(`/orders/${o.id}`, { token: buyer })).body.status).toBe('CONFIRMED');
    });
  });

  // ── Гонки при оформлении ──
  describe('одновременные заказы не превышают лимит и баллы', () => {
    it('кредитный лимит: из шести одновременных заказов по отсрочке проходит только то, что в лимите', async () => {
      const b = await registerBuyer();
      const app = (await req('/financing/apply', { token: b.token, body: { requestedLimit: 150_000 } })).body;
      await req(`/financing/${app.id}/decide`, { token: admin, body: { approve: true, approvedLimit: 150_000 } });

      const results = await Promise.all(
        Array.from({ length: 6 }, () => order(b.token, { paymentTerm: 'NET_TERMS', netTermDays: 30 })),
      );
      const ok = results.filter((r) => r.status === 201).length;
      const fin = (await req('/financing/me', { token: b.token })).body;

      // Лимит 150 000, заказ — 100 000: помещается ровно один.
      expect(ok).toBe(1);
      expect(fin.creditUsed).toBeLessThanOrEqual(fin.creditLimit);
    });

    it('баллы: одновременные заказы не уводят баланс в минус', async () => {
      const b = await registerBuyer();
      // Заработать баллы: заказ на 10 штук (1 000 000) доводится до доставки → 1% = 10 000.
      const big = (await req('/orders', { token: b.token, body: { items: [{ productId: product.id, quantity: 10 }] } })).body;
      for (const status of ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED']) {
        await req(`/orders/${big.id}/status`, { method: 'PATCH', token: admin, body: { status } });
      }
      const balance = async () => Number((await req('/vetpoints/balance', { token: b.token })).body.balance);
      const start = await balance();
      expect(start).toBe(10_000);

      // Каждый заказ на 100 000 может списать до 10% = 10 000 — весь баланс.
      await Promise.all(Array.from({ length: 5 }, () => order(b.token, { vetPointsUsed: start })));
      expect(await balance()).toBeGreaterThanOrEqual(0);
    });
  });

  // Два одновременных «Доставлен» начисляли баллы дважды: проверка «уже
  // начислено» и начисление шли без блокировки.
  it('одновременная доставка начисляет баллы один раз', async () => {
    const b = await registerBuyer();
    const o = (await req('/orders', { token: b.token, body: { items: [{ productId: product.id, quantity: 10 }] } })).body;
    for (const status of ['CONFIRMED', 'PROCESSING', 'SHIPPED']) {
      await req(`/orders/${o.id}/status`, { method: 'PATCH', token: admin, body: { status } });
    }
    const results = await Promise.all(
      Array.from({ length: 4 }, () => req(`/orders/${o.id}/status`, { method: 'PATCH', token: admin, body: { status: 'DELIVERED' } })),
    );
    expect(results.every((r) => r.status === 200 || r.status === 409)).toBe(true);
    expect(Number((await req('/vetpoints/balance', { token: b.token })).body.balance)).toBe(10_000);
  });

  // Лицензии продавцов отдавались всем по ссылке /api/files/:id.
  it('лицензия продавца закрыта: только владельцу и администратору', async () => {
    const form = new FormData();
    form.append('file', new Blob([Buffer.from('%PDF-1.4\n%e2e license\n')], { type: 'application/pdf' }), 'license.pdf');
    const up = await fetch(`${BASE}/uploads?kind=license`, { method: 'POST', headers: { Authorization: `Bearer ${seller}` }, body: form });
    expect(up.status).toBe(201);
    const { url } = await up.json();
    const doc = (await req('/sellers/me/documents', { token: seller, body: { title: 'Лицензия e2e', fileUrl: url } })).body;
    expect(doc.id).toBeTruthy();

    // Общая ссылка закрыта (в режиме S3 файл лежит в бакете — проверка про Postgres).
    if (/\/api\/files\//.test(url)) expect((await fetch(url.replace(/^.*\/api/, BASE))).status).toBe(404);

    const other = await login('agrovet@vetglobal.com', 'seller123');
    expect((await req(`/seller-documents/${doc.id}/file`, { token: other })).status).toBe(404);
    expect((await req(`/seller-documents/${doc.id}/file`)).status).toBe(401);
    expect((await req(`/seller-documents/${doc.id}/file`, { token: seller })).status).toBeLessThan(400);
    expect((await req(`/seller-documents/${doc.id}/file`, { token: admin })).status).toBeLessThan(400);
  });

  // ── Организация ──
  // Раньше человека добавляли в чужую организацию без спроса: его заказы
  // уходили на согласование постороннему, а тот видел его телефон.
  it('приглашение без согласия не действует; принятое можно покинуть', async () => {
    const owner = await registerBuyer();
    const victim = await registerBuyer();
    await req('/org', { token: owner.token, body: { name: `Чужая ${uniq()}` } });
    expect((await req('/org/members', { token: owner.token, body: { email: victim.email, spendLimit: 0 } })).status).toBe(201);

    // До согласия: заказ не уходит на согласование, контакты не видны.
    expect((await order(victim.token)).body.approvalStatus).toBe('NONE');
    const seen = (await req('/org/me', { token: owner.token })).body.members.find((m: any) => m.userId === victim.id);
    expect(seen.pending).toBe(true);
    expect(seen.user.phone).toBe('');
    expect((await req('/org/me', { token: victim.token })).body.invitation).toBeTruthy();

    // Согласился — членство действует; вышел — снова сам по себе.
    expect((await req('/org/invitation/accept', { token: victim.token, body: {} })).status).toBe(201);
    expect((await order(victim.token)).body.approvalStatus).toBe('PENDING');
    expect((await req('/org/leave', { token: victim.token, body: {} })).status).toBe(201);
    expect((await order(victim.token)).body.approvalStatus).toBe('NONE');
  });

  it('приглашение можно отклонить', async () => {
    const owner = await registerBuyer();
    const invitee = await registerBuyer();
    await req('/org', { token: owner.token, body: { name: `Чужая ${uniq()}` } });
    await req('/org/members', { token: owner.token, body: { email: invitee.email } });
    expect((await req('/org/invitation/decline', { token: invitee.token, body: {} })).status).toBe(201);
    expect((await req('/org/me', { token: invitee.token })).body.invitation).toBeNull();
  });

  // ── Деньги и реквизиты ──
  it('доставка с отрицательной стоимостью не принимается', async () => {
    const o = (await order(buyer)).body;
    const r = await req(`/orders/${o.id}/shipments`, { token: seller, body: { method: 'COURIER', cost: -100000 } });
    expect(r.status).toBe(400);
    expect((await req(`/orders/${o.id}`, { token: buyer })).body.total).toBe(o.total);
  });

  it('срок отсрочки и число платежей ограничены', async () => {
    expect((await order(buyer, { paymentTerm: 'NET_TERMS', netTermDays: 36500 })).status).toBe(400);
    expect((await order(buyer, { paymentTerm: 'INSTALLMENT', installments: 5000 })).status).toBe(400);
  });

  it('чужое юрлицо в заказ не подставляется', async () => {
    const other = await registerBuyer();
    const cp = (await req('/users/me/counterparties', { token: other.token, body: { name: 'ООО Чужое', inn: '123456789' } })).body;
    expect((await order(buyer, { counterpartyId: cp.id })).status).toBe(400);
  });

  it('публичный список отзывов не показывает непроверенные', async () => {
    const r = await req('/reviews?approved=false');
    expect(r.status).toBe(200);
    expect(r.body.every((x: any) => x.isApproved === true)).toBe(true);
  });

  it('push-подписка на произвольный адрес не принимается (SSRF)', async () => {
    const r = await req('/push/subscribe', {
      token: buyer,
      body: { endpoint: 'http://localhost:8000/api/health', keys: { p256dh: 'x', auth: 'y' } },
    });
    expect(r.status).toBe(400);
  });
});
