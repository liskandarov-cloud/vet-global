// Организация покупателя: лимиты закупщиков и согласование заказов — против
// живого стека.
//
// Организация распоряжается деньгами: закупщик покупает в пределах своего
// лимита, сверх него заказ ждёт решения владельца или управляющего. Здесь
// проверяется весь путь такого заказа и то, что ни закупщик, ни продавец, ни
// чужая организация этот путь не обходят.
//
// Организация, её участники и продавец с собственным товаром заводятся заново на
// каждый прогон: демо-организация сида общая, и её лимиты меняют другие наборы.
// Тесты внутри файла идут по порядку и опираются на состояние предыдущих.

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
    body: { email, password: 'secret123', fullName: `E2E ${email}`, phone: '+998900000000', role, acceptTerms: true },
  });
  expect(r.status).toBe(201);
  return { token: r.body.token, id: r.body.user.id, email };
};

describe('Организация: лимиты закупщиков и согласование заказов', () => {
  const stamp = Date.now();
  let admin: string;
  let seller: Account;
  let owner: Account;
  let manager: Account;
  let purchaser: Account;
  let outsider: Account;
  let orgId: string;
  let productId: string;
  // Заказ закупщика сверх лимита: на нём проходит весь путь согласования.
  let pending: any;

  // Цена товара 1000, остаток не отслеживается: сумма заказа = 1000 × qty.
  const order = async (token: string, quantity: number) => {
    const r = await req('/orders', { token, body: { items: [{ productId, quantity }] } });
    expect(r.status).toBe(201);
    return r.body;
  };
  const getOrder = async (id: string) => (await req(`/orders/${id}`, { token: admin })).body;
  const approvals = async (token: string) => ((await req('/org/approvals', { token })).body as any[]).map((o) => o.id);
  const decide = (id: string, token: string, approve: boolean) =>
    req(`/org/approvals/${id}`, { token, body: { approve } });
  const payment = (orderId: string, token: string) =>
    req('/payments', { token, body: { orderId, provider: 'CLICK' } });
  const membership = async (userId: string) =>
    ((await req('/org/me', { token: owner.token })).body.members as any[]).find((m) => m.userId === userId);

  beforeAll(async () => {
    admin = await login('admin@vetglobal.com', ADMIN_PW);

    seller = await register(`org-seller-${stamp}@vg.test`, 'SELLER');
    const v = await req(`/admin/users/${seller.id}/verify`, { method: 'PATCH', token: admin, body: { isVerified: true } });
    expect(v.status).toBe(200);
    const categoryId = (await req('/categories')).body[0].id;
    const p = await req('/products', {
      token: seller.token,
      body: { name: `Org probe ${stamp}`, description: 'e2e', price: 1000, categoryId, manufacturer: `Org ${stamp}` },
    });
    expect(p.status).toBe(201);
    productId = p.body.id;

    owner = await register(`org-owner-${stamp}@vg.test`);
    manager = await register(`org-manager-${stamp}@vg.test`);
    purchaser = await register(`org-purchaser-${stamp}@vg.test`);
    outsider = await register(`org-outsider-${stamp}@vg.test`);

    const created = await req('/org', { token: owner.token, body: { name: `E2E Клиника ${stamp}` } });
    expect(created.status).toBe(201);
    orgId = created.body.org.id;
    expect(created.body.myRole).toBe('OWNER');

    expect((await req('/org/members', { token: owner.token, body: { email: manager.email, role: 'MANAGER' } })).status).toBe(201);
    expect(
      (await req('/org/members', { token: owner.token, body: { email: purchaser.email, role: 'PURCHASER', spendLimit: 5000 } })).status,
    ).toBe(201);

    // Чужая организация со своим владельцем.
    expect((await req('/org', { token: outsider.token, body: { name: `E2E Чужая ${stamp}` } })).status).toBe(201);
  });

  it('закупщик в пределах лимита: заказ организации, согласование не нужно, оплата открыта', async () => {
    const o = await order(purchaser.token, 2); // 2000 ≤ 5000
    expect(o.orgId).toBe(orgId);
    expect(o.approvalStatus).toBe('NONE');
    expect((await payment(o.id, purchaser.token)).status).toBe(201);
  });

  it('закупщик сверх лимита: заказ ждёт согласования, оплатить его нельзя', async () => {
    pending = await order(purchaser.token, 10); // 10000 > 5000
    expect(pending.orgId).toBe(orgId);
    expect(pending.approvalStatus).toBe('PENDING');

    const pay = await payment(pending.id, purchaser.token);
    expect(pay.status).toBe(400);
    expect(pay.body.message).toMatch(/согласован/);
  });

  it('заказ на согласовании видят владелец и управляющий своей организации — и только они', async () => {
    expect(await approvals(owner.token)).toContain(pending.id);
    expect(await approvals(manager.token)).toContain(pending.id);
    expect(await approvals(purchaser.token)).toEqual([]);
    expect(await approvals(outsider.token)).not.toContain(pending.id);
  });

  it('закупщик не согласует свой заказ, чужая организация — чужой', async () => {
    expect((await decide(pending.id, purchaser.token, true)).status).toBe(403);
    expect((await decide(pending.id, outsider.token, true)).status).toBe(404);
    expect((await decide(pending.id, seller.token, true)).status).toBe(404);
    expect((await getOrder(pending.id)).approvalStatus).toBe('PENDING');
  });

  // Согласование — решение покупателя о том, нужна ли ему эта закупка. Продавец,
  // подтвердив заказ раньше решения, отгружал то, что организация ещё не
  // одобрила, — а при отказе заказ отменялся уже отгруженным.
  it('продавец не исполняет заказ, пока организация его не согласовала', async () => {
    const r = await req(`/orders/${pending.id}/status`, {
      method: 'PATCH',
      token: seller.token,
      body: { status: 'CONFIRMED' },
    });
    expect(r.status).toBe(400);
    expect(r.body.message).toMatch(/согласован/);
    expect((await getOrder(pending.id)).status).toBe('PENDING');
  });

  it('управляющий согласует: оплата открывается, повторное решение не принимается', async () => {
    const d = await decide(pending.id, manager.token, true);
    expect(d.status).toBe(201);
    const after = await getOrder(pending.id);
    expect(after.approvalStatus).toBe('APPROVED');
    expect(after.approvedById).toBe(manager.id);
    expect(after.status).toBe('PENDING');

    expect((await decide(pending.id, owner.token, false)).status).toBe(400);
    expect(await approvals(owner.token)).not.toContain(pending.id);
    expect((await payment(pending.id, purchaser.token)).status).toBe(201);

    // Согласованный заказ продавец исполняет как обычный.
    const confirm = await req(`/orders/${pending.id}/status`, {
      method: 'PATCH',
      token: seller.token,
      body: { status: 'CONFIRMED' },
    });
    expect(confirm.status).toBe(200);
  });

  it('отказ владельца отменяет заказ, и оплатить его уже нельзя', async () => {
    const o = await order(purchaser.token, 8);
    expect(o.approvalStatus).toBe('PENDING');

    expect((await decide(o.id, owner.token, false)).status).toBe(201);
    const after = await getOrder(o.id);
    expect(after.approvalStatus).toBe('REJECTED');
    expect(after.status).toBe('CANCELLED');
    expect((await payment(o.id, purchaser.token)).status).toBe(400);
    // Отклонённый заказ снова не согласовать.
    expect((await decide(o.id, manager.token, true)).status).toBe(400);
  });

  it('владелец и управляющий покупают на любую сумму без согласования', async () => {
    for (const who of [owner, manager]) {
      const o = await order(who.token, 50);
      expect(o.orgId).toBe(orgId);
      expect(o.approvalStatus).toBe('NONE');
    }
  });

  it('лимит 0 означает согласование на любую сумму', async () => {
    const m = await membership(purchaser.id);
    expect((await req(`/org/members/${m.id}`, { method: 'PATCH', token: manager.token, body: { spendLimit: 0 } })).status).toBe(200);
    const o = await order(purchaser.token, 1);
    expect(o.approvalStatus).toBe('PENDING');
  });

  it('чужая организация не видит и не меняет состав', async () => {
    const m = await membership(purchaser.id);
    const patch = await req(`/org/members/${m.id}`, { method: 'PATCH', token: outsider.token, body: { spendLimit: 99_000_000 } });
    expect(patch.status).toBe(404);
    expect((await req(`/org/members/${m.id}`, { method: 'DELETE', token: outsider.token })).status).toBe(404);
    const theirs = (await req('/org/me', { token: outsider.token })).body;
    expect((theirs.members as any[]).some((x) => x.userId === purchaser.id)).toBe(false);
    expect((await membership(purchaser.id)).spendLimit).toBe(0);
  });

  // Состав и роли — дело владельца (organizations/permissions.ts): управляющий
  // приглашает закупщиков и настраивает их лимиты. Удаление участника при этом
  // проверяло только «владелец или управляющий», и управляющий исключал
  // второго владельца или другого управляющего — тот же захват прав, что
  // запрещён при смене ролей.
  it('управляющий не исключает владельцев и управляющих, но исключает закупщика', async () => {
    const owner2 = await register(`org-owner2-${stamp}@vg.test`);
    const manager2 = await register(`org-manager2-${stamp}@vg.test`);
    const purchaser2 = await register(`org-purchaser2-${stamp}@vg.test`);
    for (const [who, role] of [[owner2, 'OWNER'], [manager2, 'MANAGER'], [purchaser2, 'PURCHASER']] as const) {
      expect((await req('/org/members', { token: owner.token, body: { email: who.email, role } })).status).toBe(201);
    }

    for (const target of [owner, owner2, manager2]) {
      const m = await membership(target.id);
      const r = await req(`/org/members/${m.id}`, { method: 'DELETE', token: manager.token });
      expect(`${m.role} → ${r.status}`).toBe(`${m.role} → 403`);
      expect(await membership(target.id)).toBeTruthy();
    }

    const p2 = await membership(purchaser2.id);
    expect((await req(`/org/members/${p2.id}`, { method: 'DELETE', token: manager.token })).status).toBe(200);
    expect(await membership(purchaser2.id)).toBeUndefined();

    // Владелец состав меняет: второго владельца исключить может.
    const o2 = await membership(owner2.id);
    expect((await req(`/org/members/${o2.id}`, { method: 'DELETE', token: owner.token })).status).toBe(200);
  });
});
