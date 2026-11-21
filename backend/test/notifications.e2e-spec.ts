// Каждое событие доходит до той стороны, которой нужно действовать.
//
// Продавец узнавал о простом заказе, оплате и отмене только из письма, а без
// почтового провайдера не узнавал вовсе; в тендерах, кредите и проверке
// продавцов уведомлений не было, администратору — только письмо. И всё —
// только по-русски.
export {};

const BASE = process.env.API_URL ?? 'http://localhost:8000/api';
const ADMIN_PW = process.env.ADMIN_PASSWORD ?? 'admin123';

async function req(path: string, opts: { method?: string; token?: string; body?: unknown; lang?: string } = {}) {
  const res = await fetch(BASE + path, {
    method: opts.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
      ...(opts.lang ? { 'Accept-Language': opts.lang } : {}),
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

type Note = { title: string; body: string; url: string | null };

// Уведомления пишутся после ответа — ждём, а не читаем один раз.
async function waitNote(token: string, match: (n: Note) => boolean, lang?: string): Promise<Note> {
  for (let i = 0; i < 30; i++) {
    const items = ((await req('/notifications', { token, lang })).body.items ?? []) as Note[];
    const hit = items.find(match);
    if (hit) return hit;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('уведомление не пришло');
}

describe('уведомления по событиям', () => {
  const stamp = Date.now();
  let admin: string;
  let seller: string;
  let buyer: string;
  let productId: string;
  const company = `Notify ${stamp}`;

  const order = async () => {
    const r = await req('/orders', { method: 'POST', token: buyer, body: { items: [{ productId, quantity: 1 }] } });
    expect(r.status).toBe(201);
    return r.body as { id: string };
  };

  beforeAll(async () => {
    admin = await login('admin@vetglobal.com', ADMIN_PW);
    const r = await req('/auth/register', {
      method: 'POST',
      body: { email: `notify-${stamp}@vg.test`, password: 'secret123', fullName: 'E2E', phone: '+998900000000', role: 'SELLER', company, acceptTerms: true },
    });
    seller = r.body.token;
    await waitNote(admin, (n) => n.title === 'Новый продавец ждёт проверки' && n.body.startsWith(company));
    expect((await req(`/admin/users/${r.body.user.id}/verify`, { method: 'PATCH', token: admin, body: { isVerified: true } })).status).toBe(200);
    const categoryId = (await req('/categories')).body[0].id;
    productId = (await req('/products', { method: 'POST', token: seller, body: { name: `Notify probe ${stamp}`, description: 'e2e', price: 1000, categoryId } })).body.id;
    await req('/offers', { method: 'POST', token: seller, body: { productId, price: 1000, inStock: true } });
    buyer = await login('buyer@vetglobal.com', 'buyer123');
  });

  it('продавцу сообщают о проверке', async () => {
    await waitNote(seller, (n) => n.title === 'Аккаунт продавца подтверждён');
  });

  it('новый заказ — продавцу и администратору, по-узбекски на узбекском', async () => {
    const o = await order();
    const no = o.id.slice(0, 8);
    await waitNote(seller, (n) => n.title === `Новый заказ #${no}` && n.url === '/seller');
    await waitNote(seller, (n) => n.title === `Yangi buyurtma #${no}` && /^Xaridor: /.test(n.body), 'uz');
    await waitNote(admin, (n) => n.title === `Новый заказ #${no}`);
  });

  it('оплата — покупателю и продавцу', async () => {
    const o = await order();
    const pay = await req('/payments', { method: 'POST', token: buyer, body: { orderId: o.id, provider: 'PAYME' } });
    expect(pay.status).toBeLessThan(300);
    expect((await req(`/payments/${pay.body.id}/mock-confirm`, { method: 'POST', token: buyer, body: {} })).status).toBeLessThan(300);
    await waitNote(buyer, (n) => n.title === 'Оплата получена' && n.url === `/orders/${o.id}`);
    await waitNote(seller, (n) => n.title === `Заказ #${o.id.slice(0, 8)} оплачен`);
  });

  it('отмена администратором — продавцу', async () => {
    const o = await order();
    expect((await req(`/orders/${o.id}/status`, { method: 'PATCH', token: admin, body: { status: 'CANCELLED' } })).status).toBe(200);
    await waitNote(seller, (n) => n.title === `Заказ #${o.id.slice(0, 8)} отменён`);
  });

  it('тендер: запрос — продавцам, предложение — покупателю, выбор — победителю', async () => {
    const title = `Notify RFQ ${stamp}`;
    const rfq = await req('/rfq', { method: 'POST', token: buyer, body: { title, items: [{ name: 'Вакцина', quantity: 10 }] } });
    expect(rfq.status).toBe(201);
    await waitNote(seller, (n) => n.title === 'Новый запрос цен' && n.url === `/rfq/${rfq.body.id}`);

    const quote = await req(`/rfq/${rfq.body.id}/quote`, { method: 'POST', token: seller, body: { totalPrice: 100000 } });
    expect(quote.status).toBe(201);
    await waitNote(buyer, (n) => n.title === 'Новое предложение по запросу' && n.body.startsWith(`«${title}»`));

    const award = await req(`/rfq/${rfq.body.id}/award/${quote.body.id}`, { method: 'POST', token: buyer });
    expect(award.status).toBeLessThan(300);
    await waitNote(seller, (n) => n.title === 'Ваше предложение выбрано' && n.body.includes(award.body.orderId.slice(0, 8)));
  });

  it('кредит: заявка — администратору, решение — покупателю', async () => {
    const app = await req('/financing/apply', { method: 'POST', token: buyer, body: { requestedLimit: 1000 } });
    expect(app.status).toBe(201);
    await waitNote(admin, (n) => n.title === 'Заявка на кредитный лимит');
    expect((await req(`/financing/${app.body.id}/decide`, { method: 'POST', token: admin, body: { approve: true, approvedLimit: 1000 } })).status).toBeLessThan(300);
    await waitNote(buyer, (n) => n.title === 'Кредитный лимит одобрен', undefined);
    await waitNote(buyer, (n) => n.title === 'Kredit limiti maʼqullandi', 'uz');
  });
});

describe('привязка Telegram', () => {
  it('без бота: недоступно, понятная ошибка на обоих языках; секреты не в профиле', async () => {
    const buyer = await login('buyer@vetglobal.com', 'buyer123');
    expect((await req('/users/me/telegram', { token: buyer })).body).toEqual({ available: false, linked: false });
    const ru = await req('/users/me/telegram', { method: 'POST', token: buyer });
    expect([ru.status, ru.body.message]).toEqual([400, 'Telegram-бот не подключён']);
    const uz = await req('/users/me/telegram', { method: 'POST', token: buyer, lang: 'uz' });
    expect(uz.body.message).toBe('Telegram-bot ulanmagan');
    expect((await req('/users/me/telegram', { method: 'DELETE', token: buyer })).body).toEqual({ ok: true });

    const me = await req('/users/me', { method: 'PATCH', token: buyer, body: {} });
    expect(me.status).toBe(200);
    expect(me.body.telegramLinked).toBe(false);
    for (const k of ['telegramLinkToken', 'telegramLinkUntil', 'telegramChatId', 'passwordHash']) expect(me.body).not.toHaveProperty(k);
  });
});
