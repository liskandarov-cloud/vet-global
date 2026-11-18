// Кто к чему имеет доступ — против живого стека.
//
// Покупатель, продавец и администратор ходят в одно API, и граница между ними —
// это только проверки на сервере: интерфейс прячет кнопки, но запрос можно
// отправить и без него. Здесь проверяется, что каждая роль упирается в свою
// границу, а участники сделки не видят и не меняют чужих заказов и платежей.
//
// Участники заводятся заново на каждый прогон (продавец с собственным товаром,
// два покупателя): общие демо-аккаунты расходуются другими наборами, и тест на
// чужом остатке или чужих баллах падал бы не из-за кода.

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

const register = async (email: string, role: 'BUYER' | 'SELLER', extra: Record<string, unknown> = {}) => {
  const r = await req('/auth/register', {
    body: { email, password: 'secret123', fullName: 'E2E', phone: '+998900000000', role, acceptTerms: true, ...extra },
  });
  expect(r.status).toBe(201);
  return { token: r.body.token as string, id: r.body.user.id as string };
};

// Ответ по каждому адресу — одной строкой, чтобы при падении было видно, какой
// именно адрес пропустил чужую роль, а не только что «что-то не 403».
const statuses = async (routes: [string, string][], token?: string) =>
  Promise.all(routes.map(async ([method, path]) => `${method} ${path} → ${(await req(path, { method, token, body: method === 'GET' ? undefined : {} })).status}`));

describe('Роли: покупатель и продавец не попадают в чужие кабинеты', () => {
  let buyer: string;
  let seller: string;

  beforeAll(async () => {
    buyer = await login('buyer@vetglobal.com', 'buyer123');
    seller = await login('seller@vetglobal.com', 'seller123');
  });

  // Всё, что меняет витрину, деньги или чужие аккаунты.
  const adminOnly: [string, string][] = [
    ['GET', '/admin/stats'],
    ['GET', '/admin/billing'],
    ['GET', '/admin/billing/export'],
    ['GET', '/admin/users'],
    ['GET', '/admin/audit'],
    ['PATCH', '/admin/users/00000000-0000-0000-0000-000000000000/verify'],
    ['PATCH', '/admin/users/00000000-0000-0000-0000-000000000000/ban'],
    ['DELETE', '/admin/users/00000000-0000-0000-0000-000000000000'],
    ['GET', '/financing'],
    ['POST', '/financing/00000000-0000-0000-0000-000000000000/decide'],
    ['GET', '/offers/verification-queue'],
    ['POST', '/offers/00000000-0000-0000-0000-000000000000/verify'],
    ['GET', '/rfq/all'],
    ['GET', '/reviews/pending'],
    ['GET', '/consultations'],
    ['GET', '/leads'],
    ['POST', '/categories'],
    ['POST', '/blog'],
    ['POST', '/subscriptions/run-due'],
    ['POST', '/products/stock-alerts/run'],
    ['DELETE', '/orders/00000000-0000-0000-0000-000000000000'],
  ];

  // Кабинет продавца: товары, цены, импорт прайса, тарифы, акции.
  const sellerOnly: [string, string][] = [
    ['POST', '/products'],
    ['POST', '/offers'],
    ['GET', '/offers/mine'],
    ['POST', '/contract-prices'],
    ['GET', '/contract-prices/seller'],
    ['POST', '/promotions'],
    ['GET', '/promotions/mine'],
    ['POST', '/delivery/tariffs'],
    ['GET', '/delivery/tariffs/mine'],
    ['POST', '/import/parse'],
    ['POST', '/import/commit'],
    ['GET', '/import/export'],
    ['POST', '/sync/key'],
    ['GET', '/seller/stats'],
    ['GET', '/sellers/me/documents'],
    ['PATCH', '/orders/00000000-0000-0000-0000-000000000000/status'],
    ['POST', '/orders/00000000-0000-0000-0000-000000000000/confirm-availability'],
  ];

  it('без входа административные функции закрыты', async () => {
    const got = await statuses(adminOnly);
    expect(got).toEqual(adminOnly.map(([m, p]) => `${m} ${p} → 401`));
  });

  it('покупатель не открывает ни одной административной функции', async () => {
    const got = await statuses(adminOnly, buyer);
    expect(got).toEqual(adminOnly.map(([m, p]) => `${m} ${p} → 403`));
  });

  it('продавец не открывает ни одной административной функции', async () => {
    const got = await statuses(adminOnly, seller);
    expect(got).toEqual(adminOnly.map(([m, p]) => `${m} ${p} → 403`));
  });

  it('покупатель не попадает в кабинет продавца', async () => {
    const got = await statuses(sellerOnly, buyer);
    expect(got).toEqual(sellerOnly.map(([m, p]) => `${m} ${p} → 403`));
  });
});

describe('Заказ: видят и меняют только участники сделки', () => {
  const stamp = Date.now();
  let admin: string;
  let seller: { token: string; id: string };
  let otherSeller: { token: string; id: string };
  let buyer: { token: string; id: string };
  let otherBuyer: { token: string; id: string };
  let productId: string;

  // Товар своего продавца: цена 1000, остаток не отслеживается, в наличии.
  const order = async (token: string, extra: Record<string, unknown> = {}) => {
    const r = await req('/orders', { token, body: { items: [{ productId, quantity: 2 }], ...extra } });
    expect(r.status).toBe(201);
    return r.body;
  };
  const status = (id: string, s: string, token: string) =>
    req(`/orders/${id}/status`, { method: 'PATCH', token, body: { status: s } });
  const points = async (token: string) => Number((await req('/vetpoints/balance', { token })).body.balance);
  const pay = async (orderId: string, token: string) => {
    const p = await req('/payments', { token, body: { orderId, provider: 'CLICK' } });
    expect(p.status).toBe(201);
    return p.body;
  };

  beforeAll(async () => {
    admin = await login('admin@vetglobal.com', ADMIN_PW);
    seller = await register(`acl-seller-${stamp}@vg.test`, 'SELLER', { company: `ACL ${stamp}` });
    otherSeller = await register(`acl-seller2-${stamp}@vg.test`, 'SELLER', { company: `ACL2 ${stamp}` });
    for (const s of [seller, otherSeller]) {
      const v = await req(`/admin/users/${s.id}/verify`, { method: 'PATCH', token: admin, body: { isVerified: true } });
      expect(v.status).toBe(200);
    }
    buyer = await register(`acl-buyer-${stamp}@vg.test`, 'BUYER');
    otherBuyer = await register(`acl-buyer2-${stamp}@vg.test`, 'BUYER');

    const categoryId = (await req('/categories')).body[0].id;
    const p = await req('/products', {
      token: seller.token,
      body: { name: `ACL probe ${stamp}`, description: 'e2e', price: 1000, categoryId, manufacturer: `ACL ${stamp}` },
    });
    expect(p.status).toBe(201);
    productId = p.body.id;
  });

  it('сумма заказа считается сервером: товары, комиссия и баллы к начислению', async () => {
    const o = await order(buyer.token);
    expect(o.subtotal).toBe(2000);
    expect(o.total).toBe(2000);
    expect(o.commission).toBe(240); // 12 %
    expect(o.vetPointsEarned).toBe(20); // 1 %
    expect(o.status).toBe('PENDING');
    expect(o.items.every((it: any) => it.sellerId === seller.id)).toBe(true);
  });

  it('чужой покупатель не видит заказ, его счёт и не находит его в своём списке', async () => {
    const o = await order(buyer.token);
    expect((await req(`/orders/${o.id}`, { token: otherBuyer.token })).status).toBe(403);
    expect((await req(`/orders/${o.id}/invoice`, { token: otherBuyer.token })).status).toBe(403);
    const list = (await req('/orders', { token: otherBuyer.token })).body as any[];
    expect(list.some((x) => x.id === o.id)).toBe(false);
    // Свой покупатель видит, и в его списке только его заказы.
    expect((await req(`/orders/${o.id}`, { token: buyer.token })).status).toBe(200);
    const mine = (await req('/orders', { token: buyer.token })).body as any[];
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.every((x) => x.buyerId === buyer.id)).toBe(true);
  });

  it('продавец без позиций в заказе не видит его и не меняет', async () => {
    const o = await order(buyer.token);
    expect((await req(`/orders/${o.id}`, { token: otherSeller.token })).status).toBe(403);
    expect((await req(`/orders/${o.id}/invoice`, { token: otherSeller.token })).status).toBe(403);
    expect((await status(o.id, 'CONFIRMED', otherSeller.token)).status).toBe(403);
    expect(
      (await req(`/orders/${o.id}/confirm-availability`, { method: 'POST', token: otherSeller.token })).status,
    ).toBe(403);
    const list = (await req('/orders', { token: otherSeller.token })).body as any[];
    expect(list.some((x) => x.id === o.id)).toBe(false);
    // Статус не сдвинулся.
    expect((await req(`/orders/${o.id}`, { token: buyer.token })).body.status).toBe('PENDING');
  });

  it('покупатель не меняет статус заказа и не удаляет его, продавец тоже не удаляет', async () => {
    const o = await order(buyer.token);
    expect((await status(o.id, 'DELIVERED', buyer.token)).status).toBe(403);
    expect((await req(`/orders/${o.id}`, { method: 'DELETE', token: buyer.token })).status).toBe(403);
    expect((await req(`/orders/${o.id}`, { method: 'DELETE', token: seller.token })).status).toBe(403);
    expect((await req(`/orders/${o.id}`, { token: buyer.token })).body.status).toBe('PENDING');
  });

  it('продавец не перепрыгивает шаги: из «Нового» сразу в «Отгружен» или «Доставлен» нельзя', async () => {
    const o = await order(buyer.token);
    const before = await points(buyer.token);
    expect((await status(o.id, 'SHIPPED', seller.token)).status).toBe(400);
    expect((await status(o.id, 'DELIVERED', seller.token)).status).toBe(400);
    expect((await req(`/orders/${o.id}`, { token: buyer.token })).body.status).toBe('PENDING');
    // Неоплаченный «доставленный» заказ принёс бы покупателю баллы.
    expect(await points(buyer.token)).toBe(before);
  });

  it('полный путь продавцом: баллы начисляются один раз, доставленный заказ уже не отменить', async () => {
    const o = await order(buyer.token);
    const before = await points(buyer.token);
    for (const s of ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED']) {
      const r = await status(o.id, s, seller.token);
      expect(`${s} → ${r.status}`).toBe(`${s} → 200`);
      expect(r.body.status).toBe(s);
    }
    expect(await points(buyer.token)).toBe(before + 20);

    // Повтор того же статуса безвреден и второй раз баллы не начисляет.
    expect((await status(o.id, 'DELIVERED', seller.token)).status).toBe(200);
    expect(await points(buyer.token)).toBe(before + 20);

    // DELIVERED — конечный статус: продавец его не отменяет.
    expect((await status(o.id, 'CANCELLED', seller.token)).status).toBe(400);
  });

  it('продавец отменяет заказ — повторно его подтвердить уже нельзя', async () => {
    const o = await order(buyer.token);
    expect((await status(o.id, 'CANCELLED', seller.token)).status).toBe(200);
    expect((await status(o.id, 'CONFIRMED', seller.token)).status).toBe(400);
  });

  describe('платежи', () => {
    it('чужой покупатель не создаёт платёж по чужому заказу и не видит чужой платёж', async () => {
      const o = await order(buyer.token);
      expect((await req('/payments', { token: otherBuyer.token, body: { orderId: o.id, provider: 'CLICK' } })).status).toBe(403);

      const p = await pay(o.id, buyer.token);
      expect((await req(`/payments/${p.id}/status`, { token: otherBuyer.token })).status).toBe(403);
      expect((await req(`/payments/${p.id}/mock-confirm`, { method: 'POST', token: otherBuyer.token })).status).toBe(403);
    });

    // В демо-режиме платежей (PAYMENTS_MODE=mock — так и на проде) подтверждение
    // платежа это просто запрос. Продавец, которому он был открыт, отмечал
    // оплаченным любой заказ: и свой, и вовсе чужой.
    it('продавец не создаёт платёж за покупателя и не подтверждает его оплату', async () => {
      const o = await order(buyer.token);
      for (const s of [seller, otherSeller]) {
        const r = await req('/payments', { token: s.token, body: { orderId: o.id, provider: 'CLICK' } });
        expect(r.status).toBe(403);
      }

      const p = await pay(o.id, buyer.token);
      for (const s of [seller, otherSeller]) {
        expect((await req(`/payments/${p.id}/mock-confirm`, { method: 'POST', token: s.token })).status).toBe(403);
        expect((await req(`/payments/${p.id}/status`, { token: s.token })).status).toBe(403);
      }
      const after = (await req(`/orders/${o.id}`, { token: buyer.token })).body;
      expect(after.status).toBe('PENDING');
      expect(after.payments.every((x: any) => x.status !== 'PAID')).toBe(true);
    });

    it('покупатель оплачивает свой заказ: платёж проведён, заказ подтверждён, второй платёж не создать', async () => {
      const o = await order(buyer.token);
      const p = await pay(o.id, buyer.token);
      expect(p.amount).toBe(2000);
      const c = await req(`/payments/${p.id}/mock-confirm`, { method: 'POST', token: buyer.token });
      expect(c.status).toBe(201);
      expect(c.body.status).toBe('PAID');
      expect((await req(`/orders/${o.id}`, { token: buyer.token })).body.status).toBe('CONFIRMED');
      expect((await req('/payments', { token: buyer.token, body: { orderId: o.id, provider: 'PAYME' } })).status).toBe(400);
    });

    // Отсрочка: покупатель получает товар и платит потом. Оплата проводилась
    // переводом заказа в CONFIRMED, откуда бы он ни шёл, — доставленный заказ
    // после оплаты снова становился «Подтверждённым», и продавцу приходилось
    // заново проводить его через отгрузку и доставку.
    it('оплата по отсрочке после доставки не откатывает заказ назад и освобождает лимит', async () => {
      const app = (await req('/financing/apply', {
        token: buyer.token,
        body: { requestedLimit: 1_000_000, purpose: `E2E отсрочка ${stamp}` },
      })).body;
      const d = await req(`/financing/${app.id}/decide`, {
        token: admin,
        body: { approve: true, approvedLimit: 1_000_000, note: 'E2E' },
      });
      expect(d.status).toBe(201);

      const o = await order(buyer.token, { paymentTerm: 'NET_TERMS', netTermDays: 30 });
      expect(o.paymentTerm).toBe('NET_TERMS');
      expect(Number((await req('/financing/me', { token: buyer.token })).body.creditUsed)).toBe(2000);

      for (const s of ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED']) {
        expect((await status(o.id, s, seller.token)).status).toBe(200);
      }

      const p = await pay(o.id, buyer.token);
      expect((await req(`/payments/${p.id}/mock-confirm`, { method: 'POST', token: buyer.token })).status).toBe(201);

      const after = (await req(`/orders/${o.id}`, { token: buyer.token })).body;
      expect(after.status).toBe('DELIVERED');
      expect(after.payments.some((x: any) => x.status === 'PAID')).toBe(true);
      expect(Number((await req('/financing/me', { token: buyer.token })).body.creditUsed)).toBe(0);
    });
  });

  // Юрлицо покупателя попадает в счёт-фактуру: его ИНН и название уходят в ЭДО.
  // Чужое юрлицо в заказе — это документ на компанию, которая ничего не
  // заказывала, и чужие реквизиты в счёте у постороннего.
  it('нельзя оформить заказ на чужое юрлицо', async () => {
    const foreign = await req('/users/me/counterparties', {
      token: otherBuyer.token,
      body: { name: `Чужое юрлицо ${stamp}`, inn: '309999999', isDefault: false },
    });
    expect(foreign.status).toBe(201);

    const r = await req('/orders', {
      token: buyer.token,
      body: { items: [{ productId, quantity: 2 }], counterpartyId: foreign.body.id },
    });
    expect(r.status).toBe(400);

    // Гость заказ не оформляет вовсе — ни на своё юрлицо, ни на чужое.
    const guest = await req('/orders', {
      body: {
        items: [{ productId, quantity: 2 }],
        counterpartyId: foreign.body.id,
        buyerName: 'Гость',
        buyerPhone: '+998900000001',
      },
    });
    expect(guest.status).toBe(401);

    // И заявку на кредитный лимит под чужое юрлицо не подать.
    const credit = await req('/financing/apply', {
      token: buyer.token,
      body: { requestedLimit: 1_000_000, counterpartyId: foreign.body.id, purpose: `E2E ${stamp}` },
    });
    expect(credit.status).toBe(400);

    // Своё юрлицо — можно.
    const own = await req('/users/me/counterparties', {
      token: buyer.token,
      body: { name: `Своё юрлицо ${stamp}`, inn: '301234567', isDefault: false },
    });
    const ok = await order(buyer.token, { counterpartyId: own.body.id });
    expect(ok.counterpartyId).toBe(own.body.id);
  });
});
