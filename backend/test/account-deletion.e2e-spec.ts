// Удаление аккаунта владельцем: персональные данные стираются, вход закрыт,
// почта освобождается; незавершённый заказ удаление откладывает.

import { PrismaClient } from '@prisma/client';

const BASE = process.env.API_URL ?? 'http://localhost:8000/api';
const ADMIN_PW = process.env.ADMIN_PASSWORD ?? 'admin123';
const prisma = new PrismaClient();

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

const register = (email: string) =>
  req('/auth/register', {
    method: 'POST',
    body: { email, password: 'secret123', fullName: 'Удаляемый Покупатель', phone: '+998901234567', company: 'ООО Тест', role: 'BUYER', acceptTerms: true },
  });

afterAll(() => prisma.$disconnect());

describe('Удаление аккаунта владельцем', () => {
  it('неверный пароль — отказ, ничего не удалено', async () => {
    const email = `del-wrong+${Date.now()}@vg.test`;
    const r = await register(email);
    const res = await req('/users/me/delete', { method: 'POST', token: r.body.token, body: { password: 'wrongpass1' } });
    expect(res.status).toBe(400);
    expect((await req('/auth/me', { token: r.body.token })).status).toBe(200);
  });

  it('данные обезличены, вход закрыт, почта свободна', async () => {
    const email = `del+${Date.now()}@vg.test`;
    const r = await register(email);
    const id = r.body.user.id;
    const res = await req('/users/me/delete', { method: 'POST', token: r.body.token, body: { password: 'secret123' } });
    expect(res.status).toBe(200);

    expect((await req('/auth/me', { token: r.body.token })).status).toBe(401);
    expect((await req('/auth/login', { method: 'POST', body: { email, password: 'secret123' } })).status).toBe(401);

    const u = await prisma.user.findUnique({ where: { id } });
    expect(u?.deletedAt).toBeTruthy();
    expect(u?.email).toBe(`deleted+${id}@deleted.vethub.uz`);
    expect(u?.fullName).toBe('Удалённый пользователь');
    expect(u?.phone).toBe('');
    expect(u?.company).toBeNull();

    // Тот же адрес можно зарегистрировать заново.
    expect((await register(email)).status).toBe(201);
  });

  it('незавершённый заказ откладывает удаление', async () => {
    const email = `del-order+${Date.now()}@vg.test`;
    const r = await register(email);
    const products = (await req('/products?limit=50')).body.products as any[];
    const p = products.find((x) => x.inStock) ?? products[0];
    const order = await req('/orders', {
      method: 'POST',
      token: r.body.token,
      body: { items: [{ productId: p.id, quantity: p.offerMinOrder ?? p.minOrder ?? 1 }] },
    });
    expect(order.status).toBe(201);
    const res = await req('/users/me/delete', { method: 'POST', token: r.body.token, body: { password: 'secret123' } });
    expect(res.status).toBe(409);
    expect(String(res.body.message)).toMatch(/незавершённые заказы/);
    expect((await req('/auth/me', { token: r.body.token })).status).toBe(200);
  });

  it('администратор себя не удаляет', async () => {
    const admin = (await req('/auth/login', { method: 'POST', body: { email: 'admin@vetglobal.com', password: ADMIN_PW } })).body.token;
    const res = await req('/users/me/delete', { method: 'POST', token: admin, body: { password: ADMIN_PW } });
    expect(res.status).toBe(409);
  });
});
