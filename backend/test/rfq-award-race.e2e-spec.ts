// Один тендер — один заказ, даже при двух одновременных выборах победителя.
//
// Проверка «победитель уже выбран» шла до транзакции, и двойной клик или две
// вкладки создавали два заказа на один тендер со списанием склада дважды.
export {};

const BASE = process.env.API_URL ?? 'http://localhost:8000/api';

async function req(path: string, opts: { method?: string; token?: string; body?: unknown } = {}) {
  const res = await fetch(BASE + path, {
    method: opts.method ?? 'GET',
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
  (await req('/auth/login', { method: 'POST', body: { email, password } })).body.token as string;

describe('выбор победителя тендера', () => {
  it('два одновременных выбора — один заказ', async () => {
    const buyer = await login('buyer@vetglobal.com', 'buyer123');
    const seller = await login('seller@vetglobal.com', 'seller123');
    const rfq = await req('/rfq', {
      method: 'POST',
      token: buyer,
      body: { title: `Race ${Date.now()}`, items: [{ name: 'Вакцина', quantity: 10 }] },
    });
    expect(rfq.status).toBe(201);
    const quote = await req(`/rfq/${rfq.body.id}/quote`, { method: 'POST', token: seller, body: { totalPrice: 100000 } });
    expect(quote.status).toBe(201);

    const award = () => req(`/rfq/${rfq.body.id}/award/${quote.body.id}`, { method: 'POST', token: buyer });
    const results = await Promise.all([award(), award(), award()]);
    const ok = results.filter((r) => r.status < 300);
    expect(ok).toHaveLength(1);
    expect(results.filter((r) => r.status === 400)).toHaveLength(2);

    const orders = (await req('/orders', { token: buyer })).body as { rfqId?: string }[];
    expect(orders.filter((o) => o.rfqId === rfq.body.id)).toHaveLength(1);
  });
});
