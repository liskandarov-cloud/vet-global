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
    const ship = await req(`/orders/${order.id}/shipments`, {
      token: seller,
      body: { method: 'COURIER', city: 'Ташкент', carrier: 'BTS', trackingNumber: 'T1', cost: 40000 },
    });
    expect(ship.status).toBe(201);
    expect(ship.body.status).toBe('PENDING');
    // Список, а не одна отправка: в заказе может быть несколько поставщиков,
    // и покупатель должен видеть посылки каждого.
    const view = await req(`/orders/${order.id}/shipments`, { token: buyer });
    expect(Array.isArray(view.body)).toBe(true);
    expect(view.body).toHaveLength(1);
    expect(view.body[0].carrier).toBe('BTS');
    expect(view.body[0].sellerId).toBe(sellerId);
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
  // Тендер должен заканчиваться сделкой, а не пометкой «выбран»: выбор
  // победителя создаёт обычный заказ (счёт, ЭДО и доставка работают дальше).
  it('rfq: buyer requests → seller quotes → award creates a real order', async () => {
    const rfq = (await req('/rfq', {
      method: 'POST',
      token: buyer,
      body: {
        title: `E2E тендер ${Date.now()}`,
        items: [{ name: 'Вакцина НБ', quantity: 10, unit: 'флакон' }],
      },
    })).body;
    expect(rfq.id).toBeTruthy();

    // покупатель видит свой запрос сразу, до всяких котировок
    const mine = (await req('/rfq/mine', { token: buyer })).body;
    expect(mine.some((r: any) => r.id === rfq.id)).toBe(true);

    // продавец видит запрос и даёт котировку
    const open = (await req('/rfq/open', { token: seller })).body;
    expect(open.some((r: any) => r.id === rfq.id)).toBe(true);
    const quote = (await req(`/rfq/${rfq.id}/quote`, {
      method: 'POST',
      token: seller,
      body: { totalPrice: 1850000, leadTimeDays: 4 },
    })).body;

    // выбор победителя → сделка
    const awarded = (await req(`/rfq/${rfq.id}/award/${quote.id}`, { method: 'POST', token: buyer })).body;
    expect(awarded.status).toBe('AWARDED');
    expect(awarded.order).toBeTruthy();
    expect(awarded.order.total).toBe(1850000);

    // заказ виден покупателю и продавцу как обычный
    const buyerOrders = (await req('/orders', { token: buyer })).body;
    const deal = buyerOrders.find((o: any) => o.id === awarded.order.id);
    expect(deal).toBeTruthy();
    expect(Number(deal.total)).toBe(1850000);
    const sellerOrders = (await req('/orders', { token: seller })).body;
    expect(sellerOrders.some((o: any) => o.id === awarded.order.id)).toBe(true);

    // и по нему выписывается счёт
    const invoice = await req(`/orders/${awarded.order.id}/invoice`, { token: buyer });
    expect(invoice.status).toBe(200);
  });
  // «Под заказ»: заказ можно оформить, но оплата блокируется до подтверждения.
  it('backorder: out-of-stock product → order allowed, payment blocked until confirmed', async () => {
    // делаем товар продавца «под заказ»
    await req(`/products/${sellerProduct.id}`, {
      method: 'PUT', token: seller,
      body: { name: sellerProduct.name, description: sellerProduct.description, categoryId: sellerProduct.categoryId, price: Number(sellerProduct.price), inStock: false },
    });

    const order = (await req('/orders', {
      method: 'POST', token: buyer,
      body: { items: [{ productId: sellerProduct.id, quantity: sellerProduct.minOrder }] },
    })).body;
    expect(order.id).toBeTruthy();
    expect(order.requiresConfirmation).toBe(true);

    // оплата пока заблокирована
    const blocked = await req('/payments', { method: 'POST', token: buyer, body: { orderId: order.id, provider: 'CLICK' } });
    expect(blocked.status).toBe(400);

    // продавец подтверждает наличие: флаг снимается, статус остаётся PENDING
    // (иначе у покупателя пропала бы кнопка оплаты).
    const confirmed = (await req(`/orders/${order.id}/confirm-availability`, { method: 'POST', token: seller })).body;
    expect(confirmed.requiresConfirmation).toBe(false);
    expect(confirmed.status).toBe('PENDING');

    // теперь оплата проходит
    const ok = await req('/payments', { method: 'POST', token: buyer, body: { orderId: order.id, provider: 'CLICK' } });
    expect(ok.status).toBeLessThan(400);

    // повторное подтверждение уже отклоняется (нечего подтверждать)
    const again = await req(`/orders/${order.id}/confirm-availability`, { method: 'POST', token: seller });
    expect(again.status).toBe(400);

    // возвращаем товар в наличие, чтобы не мешать другим тестам
    await req(`/products/${sellerProduct.id}`, {
      method: 'PUT', token: seller,
      body: { name: sellerProduct.name, description: sellerProduct.description, categoryId: sellerProduct.categoryId, price: Number(sellerProduct.price), inStock: true },
    });
  });

  // Снятие с продажи: неактивный товар пропадает из публичного каталога,
  // но остаётся виден продавцу в своём списке.
  it('isActive: hidden product disappears from catalog but stays for seller', async () => {
    await req(`/products/${sellerProduct.id}`, {
      method: 'PUT', token: seller,
      body: { name: sellerProduct.name, description: sellerProduct.description, categoryId: sellerProduct.categoryId, price: Number(sellerProduct.price), isActive: false },
    });

    const publicList = (await req('/products?limit=200')).body.products;
    expect(publicList.some((p: any) => p.id === sellerProduct.id)).toBe(false);

    const mine = (await req(`/products?sellerId=${sellerId}&limit=200`)).body.products;
    expect(mine.some((p: any) => p.id === sellerProduct.id)).toBe(true);

    // возвращаем в каталог
    await req(`/products/${sellerProduct.id}`, {
      method: 'PUT', token: seller,
      body: { name: sellerProduct.name, description: sellerProduct.description, categoryId: sellerProduct.categoryId, price: Number(sellerProduct.price), isActive: true },
    });
    const back = (await req('/products?limit=200')).body.products;
    expect(back.some((p: any) => p.id === sellerProduct.id)).toBe(true);
  });

  // Тендер с ценами по позициям: продавец даёт разбивку → при выборе победителя
  // заказ создаётся строка-в-строку, а не одной лумп-суммой.
  it('tender: per-line quote → order gets one line per position', async () => {
    // покупатель создаёт запрос на 2 позиции с разным количеством
    const rfq = (await req('/rfq', {
      method: 'POST', token: buyer,
      body: { title: `zz-tender-${Date.now()}`, items: [
        { name: 'Позиция A', quantity: 10, unit: 'фл' },
        { name: 'Позиция B', quantity: 4, unit: 'л' },
      ] },
    })).body;
    expect(rfq.id).toBeTruthy();
    expect(rfq.items.length).toBe(2);

    // продавец подаёт котировку с разбивкой по позициям
    const q = await req(`/rfq/${rfq.id}/quote`, {
      method: 'POST', token: seller,
      body: { items: [
        { rfqItemId: rfq.items[0].id, unitPrice: 1000 },
        { rfqItemId: rfq.items[1].id, unitPrice: 2500 },
      ], leadTimeDays: 5 },
    });
    expect(q.status).toBeLessThan(400);

    // итог считается на сервере: 10*1000 + 4*2500 = 20000
    const detail = (await req(`/rfq/${rfq.id}`, { token: buyer })).body;
    const myQuote = detail.quotes[0];
    expect(myQuote.totalPrice).toBe(20000);
    expect(myQuote.items.length).toBe(2);
    expect(myQuote.items.find((i: any) => i.name === 'Позиция A').lineTotal).toBe(10000);

    // неполная разбивка отклоняется (указана цена только по одной позиции)
    const bad = await req(`/rfq/${rfq.id}/quote`, {
      method: 'POST', token: seller,
      body: { items: [{ rfqItemId: rfq.items[0].id, unitPrice: 999 }] },
    });
    expect(bad.status).toBe(400);

    // покупатель выбирает победителя → заказ строка-в-строку
    const awarded = (await req(`/rfq/${rfq.id}/award/${myQuote.id}`, { method: 'POST', token: buyer })).body;
    expect(awarded.orderId).toBeTruthy();
    const order = (await req(`/orders/${awarded.orderId}`, { token: buyer })).body;
    expect(order.items.length).toBe(2);
    const total = order.items.reduce((sum: number, it: any) => sum + Number(it.price) * it.quantity, 0);
    expect(total).toBe(20000);

    await req(`/rfq/${rfq.id}`, { method: 'DELETE', token: buyer }).catch(() => {});
  });

  // «Сообщить о поступлении»: покупатель подписывается на товар «под заказ»,
  // при возврате наличия получает уведомление, подписка гасится (одноразово).
  it('stock alert: buyer subscribed → notified when product back in stock', async () => {
    // товар «под заказ»
    await req(`/products/${sellerProduct.id}`, {
      method: 'PUT', token: seller,
      body: { name: sellerProduct.name, description: sellerProduct.description, categoryId: sellerProduct.categoryId, price: Number(sellerProduct.price), inStock: false },
    });

    const sub = await req(`/products/${sellerProduct.id}/notify-me`, { method: 'POST', token: buyer });
    expect(sub.status).toBeLessThan(400);
    expect(sub.body.subscribed).toBe(true);

    const check = (await req(`/products/${sellerProduct.id}/notify-me`, { token: buyer })).body;
    expect(check.subscribed).toBe(true);

    // продавец возвращает наличие → срабатывает уведомление
    await req(`/products/${sellerProduct.id}`, {
      method: 'PUT', token: seller,
      body: { name: sellerProduct.name, description: sellerProduct.description, categoryId: sellerProduct.categoryId, price: Number(sellerProduct.price), inStock: true },
    });

    // подписка одноразовая — после срабатывания её нет
    const after = (await req(`/products/${sellerProduct.id}/notify-me`, { token: buyer })).body;
    expect(after.subscribed).toBe(false);

    // в центре уведомлений покупателя появилось «снова в наличии»
    const notifs = (await req('/notifications', { token: buyer })).body;
    expect(notifs.items.some((n: any) => /наличи/i.test(n.title) || /наличи|доступен/i.test(n.body))).toBe(true);
  });

  // Числовой остаток: списывается при заказе, нельзя купить больше, чем есть,
  // на нуле товар становится «под заказ».
  it('stock qty: decremented on order, blocks oversell, hits 0 → backorder', async () => {
    const cat = sellerProduct.categoryId;
    const prod = (await req('/products', {
      method: 'POST', token: seller,
      body: { name: `zz-stock-${Date.now()}`, description: 'x', categoryId: cat, price: 100000, minOrder: 1, stockQty: 3 },
    })).body;
    expect(prod.stockQty).toBe(3);
    expect(prod.inStock).toBe(true);

    // заказ на 2 → остаток 1
    await req('/orders', { method: 'POST', token: buyer, body: { items: [{ productId: prod.id, quantity: 2 }] } });
    let p = (await req(`/products/${prod.id}`)).body;
    expect(p.stockQty).toBe(1);
    expect(p.inStock).toBe(true);

    // нельзя купить больше, чем есть
    const over = await req('/orders', { method: 'POST', token: buyer, body: { items: [{ productId: prod.id, quantity: 5 }] } });
    expect(over.status).toBe(400);

    // добираем последний → остаток 0, товар «под заказ»
    await req('/orders', { method: 'POST', token: buyer, body: { items: [{ productId: prod.id, quantity: 1 }] } });
    p = (await req(`/products/${prod.id}`)).body;
    expect(p.stockQty).toBe(0);
    expect(p.inStock).toBe(false);

    // следующий заказ по нему — уже предзаказ
    const pre = (await req('/orders', { method: 'POST', token: buyer, body: { items: [{ productId: prod.id, quantity: 1 }] } })).body;
    expect(pre.requiresConfirmation).toBe(true);

    await req(`/products/${prod.id}`, { method: 'DELETE', token: seller }).catch(() => {});
  });

  // Отчёты не должны учитывать отменённые заказы. Раньше фильтра по статусу не
  // было вовсе: отмены попадали и в GMV, и в комиссию платформы, и в выплаты
  // продавцам — то есть в цифры, по которым выставляют счёт.
  it('отменённый заказ выпадает из GMV и комиссии', async () => {
    const before = (await req('/admin/stats', { token: admin })).body;

    // Свой товар, а не общий sellerProduct: предыдущий тест обнуляет его
    // остаток, и заказ по нему уже не создаётся.
    const fresh = (await req('/products', {
      method: 'POST',
      token: seller,
      body: {
        name: `Товар для проверки отчётов ${Date.now()}`,
        description: 'создан автотестом',
        categoryId: sellerProduct.categoryId,
        price: 100000,
      },
    })).body;

    const created = await req('/orders', {
      method: 'POST',
      token: buyer,
      body: { items: [{ productId: fresh.id, quantity: 1 }] },
    });
    expect(created.status).toBeLessThan(400);
    const orderId = created.body.id;

    const withOrder = (await req('/admin/stats', { token: admin })).body;
    expect(withOrder.gmv).toBeGreaterThan(before.gmv);

    const cancelled = await req(`/orders/${orderId}/status`, {
      method: 'PATCH',
      token: admin,
      body: { status: 'CANCELLED' },
    });
    expect(cancelled.status).toBeLessThan(400);

    const after = (await req('/admin/stats', { token: admin })).body;
    expect(after.gmv).toBe(before.gmv);
    expect(after.commission).toBe(before.commission);

    await req(`/products/${fresh.id}`, { method: 'DELETE', token: seller }).catch(() => {});
  });

  // Создание заказа занимает три ресурса: остаток на складе, кредитный лимит и
  // баллы покупателя. До этого отмена не возвращала ни одного: лимит и баллы
  // сгорали, а склад оставался списанным на товар, который никто не забрал.
  describe('отмена заказа возвращает занятое', () => {
    // Остаток выставляется тестом, а не берётся из базы: прогоны расходуют
    // запас, и тест, зависящий от оставшегося количества, рано или поздно
    // начинает падать не из-за кода.
    const withStock = async (qty: number) => {
      await req(`/products/${sellerProduct.id}`, {
        method: 'PUT',
        token: seller,
        body: {
          name: sellerProduct.name,
          description: sellerProduct.description ?? 'x',
          categoryId: sellerProduct.categoryId,
          price: sellerProduct.price,
          minOrder: sellerProduct.minOrder,
          stockQty: qty,
          inStock: true,
        },
      });
      return (await req(`/products/${sellerProduct.id}`)).body;
    };

    it('возвращает остаток на склад', async () => {
      const product = await withStock(40);
      expect(product.stockQty).toBe(40);
      const before = product.stockQty;

      const order = (await req('/orders', {
        token: buyer,
        body: { items: [{ productId: product.id, quantity: 3 }] },
      })).body;
      expect((await req(`/products/${product.id}`)).body.stockQty).toBe(before - 3);

      await req(`/orders/${order.id}/status`, { method: 'PATCH', token: admin, body: { status: 'CANCELLED' } });
      expect((await req(`/products/${product.id}`)).body.stockQty).toBe(before);
    });

    it('возвращает списанные баллы и пишет проводку', async () => {
      const before = Number((await req('/vetpoints/balance', { token: buyer })).body.balance);
      expect(before).toBeGreaterThanOrEqual(1000);

      const order = (await req('/orders', {
        token: buyer,
        body: { items: [{ productId: sellerProduct.id, quantity: sellerProduct.minOrder }], vetPointsUsed: 1000 },
      })).body;
      expect(order.vetPointsUsed).toBe(1000);
      expect(Number((await req('/vetpoints/balance', { token: buyer })).body.balance)).toBe(before - 1000);

      await req(`/orders/${order.id}/status`, { method: 'PATCH', token: admin, body: { status: 'CANCELLED' } });
      expect(Number((await req('/vetpoints/balance', { token: buyer })).body.balance)).toBe(before);

      // Возврат виден в истории: остаток баллов должен объясняться проводками.
      const tx = (await req('/vetpoints/transactions', { token: buyer })).body;
      const rows = Array.isArray(tx) ? tx : tx.transactions;
      expect(rows.some((t: any) => t.orderId === order.id && Number(t.amount) === 1000)).toBe(true);
    });

    it('повторная отмена не возвращает занятое второй раз', async () => {
      const before = Number((await req('/vetpoints/balance', { token: buyer })).body.balance);
      const order = (await req('/orders', {
        token: buyer,
        body: { items: [{ productId: sellerProduct.id, quantity: sellerProduct.minOrder }], vetPointsUsed: 500 },
      })).body;

      const cancel = () => req(`/orders/${order.id}/status`, { method: 'PATCH', token: admin, body: { status: 'CANCELLED' } });
      await cancel();
      await cancel();
      expect(Number((await req('/vetpoints/balance', { token: buyer })).body.balance)).toBe(before);
    });

    // Лимит резервируется под неоплаченный долг. После оплаты держать резерв
    // значит занимать лимит деньгами, которые покупатель уже отдал.
    it('оплата отсрочки освобождает кредитный лимит', async () => {
      const used = () => req('/financing/me', { token: buyer }).then((r) => Number(r.body.creditUsed));
      const before = await used();

      const order = (await req('/orders', {
        token: buyer,
        body: {
          items: [{ productId: sellerProduct.id, quantity: sellerProduct.minOrder }],
          paymentTerm: 'NET_TERMS',
          netTermDays: 30,
        },
      })).body;
      expect(await used()).toBeCloseTo(before + order.total, 2);

      const pay = (await req('/payments', { token: buyer, body: { orderId: order.id, provider: 'PAYME' } })).body;
      await req(`/payments/${pay.id}/mock-confirm`, { token: buyer, body: {} });
      expect(await used()).toBeCloseTo(before, 2);

      // Повторный колбэк провайдера не должен освободить лимит дважды.
      await req(`/payments/${pay.id}/mock-confirm`, { token: buyer, body: {} });
      expect(await used()).toBeCloseTo(before, 2);
    });

    it('отмена отсрочки освобождает кредитный лимит', async () => {
      const used = () => req('/financing/me', { token: buyer }).then((r) => Number(r.body.creditUsed));
      const before = await used();

      const order = (await req('/orders', {
        token: buyer,
        body: {
          items: [{ productId: sellerProduct.id, quantity: sellerProduct.minOrder }],
          paymentTerm: 'NET_TERMS',
          netTermDays: 30,
        },
      })).body;
      expect(await used()).toBeCloseTo(before + order.total, 2);

      await req(`/orders/${order.id}/status`, { method: 'PATCH', token: admin, body: { status: 'CANCELLED' } });
      expect(await used()).toBeCloseTo(before, 2);
    });
  });

  // Заказ по выигранному тендеру — такая же сделка, как покупка из каталога, и
  // должен подчиняться тем же правилам. Раньше он создавался своим путём:
  // согласование в организации обходилось, остаток склада не списывался.
  describe('заказ по тендеру подчиняется общим правилам', () => {
    // Закупщик организации с лимитом 3 млн (демо-данные сида).
    let purchaser: string;

    beforeAll(async () => {
      purchaser = await login('farm2@vetglobal.com', 'buyer123');
    });

    const awardRfq = async (token: string, price: number, items: any[]) => {
      const rfq = (await req('/rfq', {
        token,
        body: { title: `E2E тендер ${Date.now()}`, items },
      })).body;
      const quote = (await req(`/rfq/${rfq.id}/quote`, {
        token: seller,
        body: { totalPrice: price, leadTimeDays: 5 },
      })).body;
      const awarded = (await req(`/rfq/${rfq.id}/award/${quote.id}`, { method: 'POST', token })).body;
      expect(awarded.orderId).toBeTruthy();
      return (await req(`/orders/${awarded.orderId}`, { token: admin })).body;
    };

    it('сумма сверх лимита закупщика уходит на согласование', async () => {
      const order = await awardRfq(purchaser, 5_000_000, [{ name: 'Корма', quantity: 10 }]);
      expect(order.orgId).toBeTruthy();
      expect(order.approvalStatus).toBe('PENDING');
    });

    it('сумма в пределах лимита согласования не требует, но заказ принадлежит организации', async () => {
      const order = await awardRfq(purchaser, 1_000_000, [{ name: 'Корма', quantity: 1 }]);
      expect(order.orgId).toBeTruthy();
      expect(order.approvalStatus).toBe('NONE');
    });

    // Позиция тендера может ссылаться на товар каталога. Продажа обязана
    // уменьшить остаток — иначе продавец продолжит продавать проданное.
    it('списывает остаток по позициям с товаром каталога и возвращает его при отмене', async () => {
      await req(`/products/${sellerProduct.id}`, {
        method: 'PUT',
        token: seller,
        body: {
          name: sellerProduct.name,
          description: sellerProduct.description ?? 'x',
          categoryId: sellerProduct.categoryId,
          price: sellerProduct.price,
          minOrder: sellerProduct.minOrder,
          stockQty: 30,
          inStock: true,
        },
      });

      const rfq = (await req('/rfq', {
        token: buyer,
        body: {
          title: `E2E тендер со складом ${Date.now()}`,
          items: [{ productId: sellerProduct.id, name: sellerProduct.name, quantity: 4 }],
        },
      })).body;
      const rfqItemId = rfq.items[0].id;
      const quote = (await req(`/rfq/${rfq.id}/quote`, {
        token: seller,
        body: { totalPrice: 400000, items: [{ rfqItemId, unitPrice: 100000 }] },
      })).body;
      const awarded = (await req(`/rfq/${rfq.id}/award/${quote.id}`, { method: 'POST', token: buyer })).body;

      expect((await req(`/products/${sellerProduct.id}`)).body.stockQty).toBe(26);

      // Отмена возвращает ровно то, что списала.
      await req(`/orders/${awarded.orderId}/status`, { method: 'PATCH', token: admin, body: { status: 'CANCELLED' } });
      expect((await req(`/products/${sellerProduct.id}`)).body.stockQty).toBe(30);
    });

    // Позиция без товара каталога остаток не занимает, и возвращать по ней
    // нечего: иначе отмена показала бы в наличии то, чего нет.
    it('позиция без товара каталога склад не трогает', async () => {
      const order = await awardRfq(buyer, 200000, [{ name: 'Услуга доставки силоса', quantity: 1 }]);
      expect(order.items.every((it: any) => !it.productId)).toBe(true);
    });
  });

  // Отчёт по выплатам и общая статистика берут комиссию разными путями: первый
  // считает её от выручки по позициям, вторая суммирует записанную в заказах.
  // Расхождение означало бы, что продавцу выставляют счёт не на ту сумму.
  it('комиссия в отчёте по выплатам совпадает с общей статистикой', async () => {
    const stats = (await req('/admin/stats', { token: admin })).body;
    const billing = (await req('/admin/billing', { token: admin })).body;
    expect(billing.totals.commission).toBeCloseTo(stats.commission, 2);
    expect(billing.totals.revenue).toBeCloseTo(stats.gmv, 2);
    expect(billing.totals.payout).toBeCloseTo(billing.totals.revenue - billing.totals.commission, 2);
  });

  // Доставку считают в корзине, до оформления заказа, и эта цифра должна
  // совпасть с той, что попадёт в заказ. Проверяется то, из чего она
  // складывается: тариф города важнее тарифа по умолчанию, порог бесплатной
  // доставки сравнивается с суммой всего заказа (решение заказчика), самовывоз
  // бесплатен, а продавец без тарифа не обнуляет доставку молча.
  describe('тарифы доставки', () => {
    const CITY = 'Тестбург';
    const OTHER_CITY = 'Нукус';
    let tariffIds: string[] = [];
    let foreignProduct: any;

    const estimate = async (q: Record<string, string>) =>
      (await req(`/delivery/tariffs/estimate?${new URLSearchParams(q).toString()}`)).body;

    beforeAll(async () => {
      const def = await req('/delivery/tariffs', { token: seller, body: { method: 'COURIER', cost: 120000 } });
      const city = await req('/delivery/tariffs', {
        token: seller,
        body: { method: 'COURIER', city: CITY, cost: 45000, freeFrom: 5000000 },
      });
      expect(def.status).toBe(201);
      expect(city.status).toBe(201);
      tariffIds = [def.body.id, city.body.id];

      const all = (await req('/products?limit=100')).body.products as any[];
      foreignProduct = all.find((p) => p.sellerId && p.sellerId !== sellerId);
    });

    afterAll(async () => {
      for (const id of tariffIds) {
        await req(`/delivery/tariffs/${id}`, { method: 'DELETE', token: seller });
      }
    });

    it('тариф города важнее тарифа по умолчанию', async () => {
      const d = await estimate({ productIds: sellerProduct.id, method: 'COURIER', city: CITY, subtotal: '1000000' });
      expect(d.total).toBe(45000);
      expect(d.unknown).toHaveLength(0);
      expect(d.bySeller).toEqual([{ sellerId, cost: 45000 }]);
    });

    it('город без своего тарифа получает тариф по умолчанию', async () => {
      const d = await estimate({ productIds: sellerProduct.id, method: 'COURIER', city: OTHER_CITY, subtotal: '1000000' });
      expect(d.total).toBe(120000);
    });

    it('порог бесплатной доставки считается от суммы всего заказа', async () => {
      expect((await estimate({ productIds: sellerProduct.id, method: 'COURIER', city: CITY, subtotal: '4999999' })).total).toBe(45000);
      expect((await estimate({ productIds: sellerProduct.id, method: 'COURIER', city: CITY, subtotal: '5000000' })).total).toBe(0);
    });

    it('у тарифа без порога доставка не становится бесплатной на большой сумме', async () => {
      const d = await estimate({ productIds: sellerProduct.id, method: 'COURIER', city: OTHER_CITY, subtotal: '9000000' });
      expect(d.total).toBe(120000);
    });

    it('самовывоз бесплатен', async () => {
      const d = await estimate({ productIds: sellerProduct.id, method: 'PICKUP', city: CITY, subtotal: '1000' });
      expect(d.total).toBe(0);
    });

    it('продавец без тарифа попадает в unknown, а не обнуляет доставку', async () => {
      if (!foreignProduct) return; // в базе один продавец — проверять нечего
      const d = await estimate({
        productIds: `${sellerProduct.id},${foreignProduct.id}`,
        method: 'COURIER',
        city: CITY,
        subtotal: '1000000',
      });
      expect(d.unknown).toContain(foreignProduct.sellerId);
      expect(d.total).toBe(45000);
    });

    // Стоимость доставки попадает в сумму заказа при оформлении. До этого её
    // назначал продавец позже, отправкой, а пересчёт после оплаты запрещён —
    // поэтому при предоплате доставка не попадала в заказ никогда.
    it('доставка входит в сумму заказа при оформлении', async () => {
      const order = (await req('/orders', {
        token: buyer,
        body: {
          items: [{ productId: sellerProduct.id, quantity: sellerProduct.minOrder }],
          deliveryMethod: 'COURIER',
          deliveryCity: CITY,
          deliveryAddress: 'ул. Тестовая 1',
        },
      })).body;
      expect(order.deliveryCost).toBe(45000);
      expect(order.total).toBe(order.subtotal + 45000);
    });

    it('самовывоз не добавляет доставку, а отсутствие способа оставляет прежнее поведение', async () => {
      const items = [{ productId: sellerProduct.id, quantity: sellerProduct.minOrder }];
      const pickup = (await req('/orders', {
        token: buyer,
        body: { items, deliveryMethod: 'PICKUP', deliveryCity: CITY },
      })).body;
      expect(pickup.deliveryCost).toBe(0);
      expect(pickup.total).toBe(pickup.subtotal);

      const plain = (await req('/orders', { token: buyer, body: { items } })).body;
      expect(plain.deliveryCost).toBe(0);
      expect(plain.total).toBe(plain.subtotal);
    });

    // Продавец с тарифом получает деньги за доставку один раз: при оформлении.
    // Его отправка сумму заказа больше не меняет, иначе покупатель заплатил бы
    // за одну доставку дважды.
    it('отправка продавца не удваивает посчитанную доставку', async () => {
      const order = (await req('/orders', {
        token: buyer,
        body: {
          items: [{ productId: sellerProduct.id, quantity: sellerProduct.minOrder }],
          deliveryMethod: 'COURIER',
          deliveryCity: CITY,
        },
      })).body;
      expect(order.deliveryCost).toBe(45000);

      const ship = await req(`/orders/${order.id}/shipments`, {
        token: seller,
        body: { method: 'COURIER', city: CITY, cost: 45000, carrier: 'BTS' },
      });
      expect(ship.status).toBe(201);

      const after = (await req(`/orders/${order.id}`, { token: buyer })).body;
      expect(after.total).toBe(order.total);
      expect(after.deliveryCost).toBe(45000);
    });

    it('сумма заказа не зависит от стоимости, присланной клиентом', async () => {
      // deliveryCost в запросе игнорируется: иначе сумму заказа можно было бы
      // занизить, подделав её на стороне покупателя.
      const order = (await req('/orders', {
        token: buyer,
        body: {
          items: [{ productId: sellerProduct.id, quantity: sellerProduct.minOrder }],
          deliveryMethod: 'COURIER',
          deliveryCity: CITY,
          deliveryCost: 0,
          total: 1,
        },
      })).body;
      expect(order.deliveryCost).toBe(45000);
      expect(order.total).toBe(order.subtotal + 45000);
    });

    it('покупатель не может заводить тарифы продавцу', async () => {
      const res = await req('/delivery/tariffs', { token: buyer, body: { method: 'COURIER', cost: 1 } });
      expect(res.status).toBe(403);
    });
  });
});
