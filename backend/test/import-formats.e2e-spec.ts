// Прайс в тех форматах, в которых его реально сохраняет продавец.
//
// Excel с русской локалью и 1С пишут CSV в Windows-1251 с точкой с запятой.
// Раньше такой файл превращался в одну колонку кракозябр, а коды 1С теряли
// ведущие нули — и синхронизация потом не находила ни одной позиции.

export {};

const BASE = process.env.API_URL ?? 'http://localhost:8000/api';

const login = async (email: string, password: string) => {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return (await res.json()).token as string;
};

async function parse(token: string, bytes: Buffer, filename: string) {
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(bytes)], { type: 'text/csv' }), filename);
  const res = await fetch(`${BASE}/import/parse`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  return { status: res.status, body: await res.json() };
}

// Windows-1251 для кириллицы А–я — подряд с 0xC0; остального в тесте нет.
const win1251 = (s: string) =>
  Buffer.from(
    [...s].map((c) => {
      const code = c.charCodeAt(0);
      if (code < 0x80) return code;
      if (code >= 0x410 && code <= 0x44f) return code - 0x410 + 0xc0;
      throw new Error(`нет в тестовой таблице: ${c}`);
    }),
  );

const CSV = 'Код;Наименование;Цена;Остаток\r\n000123;Ивермек 1% 50 мл;48 500;120\r\n000124;Энрофлон 10%;67250,50;0\r\n';

describe('Импорт: форматы, которые сохраняет продавец', () => {
  let seller: string;

  beforeAll(async () => {
    seller = await login('seller@vetglobal.com', 'seller123');
  });

  it('CSV из Excel: Windows-1251 и точка с запятой', async () => {
    const r = await parse(seller, win1251(CSV), 'price.csv');
    expect(r.status).toBe(201);
    expect(r.body.headers).toEqual(['Код', 'Наименование', 'Цена', 'Остаток']);
    expect(r.body.suggested).toMatchObject({ externalId: 0, name: 1, price: 2, stockQty: 3 });
    // Код 1С остаётся текстом с ведущими нулями, цена — как в файле.
    expect(r.body.rows[0]).toEqual(['000123', 'Ивермек 1% 50 мл', '48 500', '120']);
    expect(r.body.rows[1][2]).toBe('67250,50');
  });

  it('CSV в UTF-8 с BOM', async () => {
    const bom = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(CSV, 'utf8')]);
    const r = await parse(seller, bom, 'price.csv');
    expect(r.body.headers[0]).toBe('Код');
    expect(r.body.rows[0][0]).toBe('000123');
  });

  it('«Юникод-текст» Excel (.txt, UTF-16, табуляция)', async () => {
    const tsv = CSV.replace(/;/g, '\t');
    const r = await parse(seller, Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(tsv, 'utf16le')]), 'price.txt');
    expect(r.status).toBe(201);
    expect(r.body.headers).toEqual(['Код', 'Наименование', 'Цена', 'Остаток']);
  });
});

// Нулевой остаток в прайсе: на карточке «нет в наличии», заказ — предзаказ.
// Раньше заказ не находил предложения «в наличии», уходил в цену карточки без
// проверки наличия и оформлялся как обычная покупка с оплатой сразу.
describe('Импорт: нулевой остаток — это предзаказ, а не покупка', () => {
  it('карточка не обещает наличия, заказ ждёт подтверждения продавца', async () => {
    const seller = await login('seller@vetglobal.com', 'seller123');
    const buyer = await login('buyer@vetglobal.com', 'buyer123');
    const json = (path: string, token: string, body?: unknown) =>
      fetch(`${BASE}${path}`, {
        method: body ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: body ? JSON.stringify(body) : undefined,
      }).then((r) => r.json());

    const categoryId = (await json('/categories', seller))[0].id;
    const name = `E2E нет на складе ${Date.now()}`;
    const imported = await json('/import/commit', seller, {
      rows: [[name, '67250', '0']],
      mapping: { name: 0, price: 1, stockQty: 2 },
      defaultCategoryId: categoryId,
    });
    expect(imported.created).toBe(1);

    const found = (await json(`/products?search=${encodeURIComponent(name)}`, buyer)).products[0];
    expect(found.inStock).toBe(false);

    const order = await json('/orders', buyer, { items: [{ productId: found.id, quantity: 2 }] });
    expect(order.requiresConfirmation).toBe(true);
    expect(order.items[0].offerId).toBeTruthy();
  });
});

// «Сообщить о поступлении»: пополнение импортом прайса тоже будит подписчиков.
// Раньше оповещение уходило только при правке карточки в кабинете.
describe('Поступление через импорт оповещает подписчиков', () => {
  it('подписка → пополнение прайсом → оповещение, подписка погашена', async () => {
    const ADMIN_PW = process.env.ADMIN_PASSWORD ?? 'admin123';
    const seller = await login('seller@vetglobal.com', 'seller123');
    const buyer = await login('buyer@vetglobal.com', 'buyer123');
    const admin = await login('admin@vetglobal.com', ADMIN_PW);
    const call = (method: string, path: string, token: string, body?: unknown) =>
      fetch(`${BASE}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: body ? JSON.stringify(body) : undefined,
      }).then((r) => r.json());

    const categoryId = (await call('GET', '/categories', seller))[0].id;
    const name = `E2E поступление ${Date.now()}`;
    const importRow = (stock: string) =>
      call('POST', '/import/commit', seller, {
        rows: [[name, '50000', stock]],
        mapping: { name: 0, price: 1, stockQty: 2 },
        defaultCategoryId: categoryId,
      });

    await importRow('0');
    const product = (await call('GET', `/products?search=${encodeURIComponent(name)}`, buyer)).products[0];
    expect(product.inStock).toBe(false);
    await call('POST', `/products/${product.id}/notify-me`, buyer);

    // Пока товара нет — обход никого не будит.
    await call('POST', '/products/stock-alerts/run', admin);
    expect((await call('GET', `/products/${product.id}/notify-me`, buyer)).subscribed).toBe(true);

    await importRow('9');
    await call('POST', '/products/stock-alerts/run', admin);

    expect((await call('GET', `/products/${product.id}/notify-me`, buyer)).subscribed).toBe(false);
    const inbox = await call('GET', '/notifications', buyer);
    const items = (inbox.items ?? inbox) as any[];
    expect(items.some((n) => n.url === `/products/${product.id}` && /снова в наличии/.test(n.title))).toBe(true);
  });
});
