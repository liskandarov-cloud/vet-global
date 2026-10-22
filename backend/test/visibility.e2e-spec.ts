// Кому можно продавать и как находится аккаунт по почте — против живого стека.
//
// Продавец регистрируется сам, но покупатели видят его товары и могут их
// заказать только после проверки администратором, а блокировка снимает его с
// витрины целиком. Сценарий идёт одним продавцом по всем трём состояниям, поэтому
// тесты в этом файле зависят от порядка.

// Файл — модуль, а не скрипт: иначе BASE, req и login конфликтуют с
// одноимёнными объявлениями app.e2e-spec.ts при проверке типов тестов.
export {};

const BASE = process.env.API_URL ?? 'http://localhost:8000/api';
const ADMIN_PW = process.env.ADMIN_PASSWORD ?? 'admin123';

async function req(path: string, opts: { method?: string; token?: string; body?: any } = {}) {
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

const register = (email: string, role: 'BUYER' | 'SELLER', extra: Record<string, unknown> = {}) =>
  req('/auth/register', {
    method: 'POST',
    body: { email, password: 'secret123', fullName: 'E2E', phone: '+998900000000', role, ...extra },
  });

describe('Витрина: только проверенные продавцы', () => {
  const stamp = Date.now();
  const productName = `Visibility probe ${stamp}`;
  let admin: string;
  let buyer: string;
  let seller: string;
  let sellerId: string;
  let productId: string;

  const inCatalog = async () =>
    ((await req(`/products?search=${encodeURIComponent(productName)}`)).body.products as any[]).some(
      (p) => p.id === productId,
    );
  const order = () =>
    req('/orders', { method: 'POST', token: buyer, body: { items: [{ productId, quantity: 1 }] } });

  beforeAll(async () => {
    admin = await login('admin@vetglobal.com', ADMIN_PW);
    buyer = await login('buyer@vetglobal.com', 'buyer123');
    const r = await register(`seller-${stamp}@vg.test`, 'SELLER', { company: `Probe ${stamp}` });
    seller = r.body.token;
    sellerId = r.body.user.id;
    expect(r.body.user.isVerified).toBe(false);

    const categoryId = (await req('/categories')).body[0].id;
    const p = await req('/products', {
      method: 'POST',
      token: seller,
      body: { name: productName, description: 'e2e', price: 1000, categoryId, manufacturer: `Probe ${stamp}` },
    });
    expect(p.status).toBe(201);
    productId = p.body.id;
  });

  it('до проверки: товара нет ни в каталоге, ни по ссылке, ни у поставщиков', async () => {
    expect(await inCatalog()).toBe(false);
    expect((await req(`/products/${productId}`)).status).toBe(404);
    expect((await req(`/products/${productId}`, { token: buyer })).status).toBe(404);
    // Страница поставщика больше не открывает его товары посторонним.
    expect((await req(`/products?sellerId=${sellerId}`)).body.total).toBe(0);
    expect((await req(`/sellers/${sellerId}`)).status).toBe(404);
    const sellers = (await req('/sellers')).body as any[];
    expect(sellers.some((s) => s.id === sellerId)).toBe(false);
  });

  it('до проверки: продавец видит и правит свой товар в кабинете', async () => {
    const mine = await req(`/products?sellerId=${sellerId}`, { token: seller });
    expect(mine.body.products.map((p: any) => p.id)).toContain(productId);
    expect((await req(`/products/${productId}`, { token: seller })).status).toBe(200);
  });

  it('до проверки: заказать нельзя даже в обход витрины', async () => {
    const r = await order();
    expect(r.status).toBe(400);
  });

  it('до проверки: в тендере участвовать нельзя', async () => {
    const rfq = await req('/rfq', {
      method: 'POST',
      token: buyer,
      body: { title: `Tender ${stamp}`, items: [{ name: 'Вакцина', quantity: 10 }] },
    });
    expect(rfq.status).toBe(201);
    const q = await req(`/rfq/${rfq.body.id}/quote`, {
      method: 'POST',
      token: seller,
      body: { totalPrice: 100000 },
    });
    expect(q.status).toBe(403);
  });

  it('после проверки: товар на витрине и заказывается', async () => {
    const v = await req(`/admin/users/${sellerId}/verify`, {
      method: 'PATCH',
      token: admin,
      body: { isVerified: true },
    });
    expect(v.status).toBe(200);
    expect(await inCatalog()).toBe(true);
    expect((await req(`/products/${productId}`)).status).toBe(200);
    expect((await req(`/sellers/${sellerId}`)).body.productsCount).toBe(1);
    expect((await order()).status).toBe(201);
  });

  it('после блокировки: продавец снят с витрины целиком', async () => {
    const b = await req(`/admin/users/${sellerId}/ban`, {
      method: 'PATCH',
      token: admin,
      body: { isBanned: true },
    });
    expect(b.status).toBe(200);
    expect(await inCatalog()).toBe(false);
    expect((await req(`/products/${productId}`)).status).toBe(404);
    expect((await req(`/sellers/${sellerId}`)).status).toBe(404);
    expect((await order()).status).toBe(400);
  });
});

describe('Почта без учёта регистра', () => {
  const stamp = Date.now();
  const mixed = `Mixed.Case-${stamp}@VG.Test`;
  const lower = mixed.toLowerCase();

  it('регистрация сохраняет почту в нижнем регистре', async () => {
    const r = await register(`  ${mixed} `, 'BUYER');
    expect(r.status).toBe(201);
    expect(r.body.user.email).toBe(lower);
  });

  it('вход работает при любом регистре', async () => {
    expect(await login(lower, 'secret123')).toBeTruthy();
    expect(await login(mixed.toUpperCase(), 'secret123')).toBeTruthy();
  });

  it('второй аккаунт на тот же ящик другим регистром не заводится', async () => {
    const r = await register(mixed.toUpperCase(), 'BUYER');
    expect(r.status).toBe(400);
  });

  it('приглашение в организацию находит пользователя при любом регистре', async () => {
    const owner = (await register(`org-owner-${stamp}@vg.test`, 'BUYER')).body.token as string;
    expect((await req('/org', { method: 'POST', token: owner, body: { name: `Org ${stamp}` } })).status).toBe(201);
    const invite = await req('/org/members', {
      method: 'POST',
      token: owner,
      body: { email: mixed.toUpperCase(), role: 'PURCHASER', spendLimit: 0 },
    });
    expect(invite.status).toBe(201);
  });
});
