// Восстановление пароля и согласие с документами при регистрации.
//
// Письмо в тесте не читается: ссылку, как её выдал бы сервер, кладём в базу
// сами (хранится только хэш) — проверяется всё, что происходит после клика.

import { createHash, randomBytes } from 'crypto';
import { PrismaClient } from '@prisma/client';

const BASE = process.env.API_URL ?? 'http://localhost:8000/api';
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

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function plantToken(userId: string, expiresInMs: number) {
  const raw = randomBytes(32).toString('base64url');
  await prisma.passwordResetToken.create({
    data: { userId, tokenHash: sha256(raw), expiresAt: new Date(Date.now() + expiresInMs) },
  });
  return raw;
}

describe('Согласие при регистрации', () => {
  const base = { password: 'secret123', fullName: 'Terms', phone: '+998900000000', role: 'BUYER' };

  it('без согласия регистрация отклоняется', async () => {
    const r = await req('/auth/register', { method: 'POST', body: { ...base, email: `noterms+${Date.now()}@vg.test` } });
    expect(r.status).toBe(400);
    const r2 = await req('/auth/register', {
      method: 'POST',
      body: { ...base, email: `falseterms+${Date.now()}@vg.test`, acceptTerms: false },
    });
    expect(r2.status).toBe(400);
  });

  it('пароль короче 8 символов не принимается', async () => {
    const r = await req('/auth/register', {
      method: 'POST',
      body: { ...base, email: `short+${Date.now()}@vg.test`, password: 'short7c', acceptTerms: true },
    });
    expect(r.status).toBe(400);
  });

  it('согласие сохраняется с датой и редакцией', async () => {
    const email = `terms+${Date.now()}@vg.test`;
    const r = await req('/auth/register', { method: 'POST', body: { ...base, email, acceptTerms: true } });
    expect(r.status).toBe(201);
    const u = await prisma.user.findUnique({ where: { email } });
    expect(u?.termsAcceptedAt).toBeTruthy();
    expect(u?.termsVersion).toMatch(/^\d{4}-\d{2}-\d{2}(\.\d+)?$/);
  });
});

describe('Восстановление пароля', () => {
  const email = `reset+${Date.now()}@vg.test`;
  const oldPw = 'OldPass12345';
  const newPw = 'NewPass12345';
  let userId: string;
  let oldSession: string;

  beforeAll(async () => {
    const r = await req('/auth/register', {
      method: 'POST',
      body: { email, password: oldPw, fullName: 'Reset <b>Probe</b>', phone: '+998900000000', role: 'BUYER', acceptTerms: true },
    });
    expect(r.status).toBe(201);
    userId = r.body.user.id;
    oldSession = r.body.token;
  });

  afterAll(() => prisma.$disconnect());

  it('ответ одинаковый для чужого и своего адреса', async () => {
    const unknown = await req('/auth/forgot-password', { method: 'POST', body: { email: `nobody+${Date.now()}@vg.test` } });
    const known = await req('/auth/forgot-password', { method: 'POST', body: { email: email.toUpperCase() } });
    expect(unknown.status).toBe(200);
    expect(known.status).toBe(200);
    expect(known.body).toEqual(unknown.body);
    // Для существующего адреса ссылка создана, и хранится хэш, а не токен.
    const tokens = await prisma.passwordResetToken.findMany({ where: { userId } });
    expect(tokens).toHaveLength(1);
    expect(tokens[0].tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('просроченная ссылка не срабатывает', async () => {
    const raw = await plantToken(userId, -1000);
    const r = await req('/auth/reset-password', { method: 'POST', body: { token: raw, password: newPw } });
    expect(r.status).toBe(400);
  });

  it('ссылка меняет пароль, отзывает старые входы и гасится', async () => {
    const raw = await plantToken(userId, 60_000);
    // Токен входа и смена пароля в одну секунду намеренно совместимы;
    // ждём, чтобы старый вход был строго раньше смены.
    await sleep(1100);
    expect((await req('/auth/me', { token: oldSession })).status).toBe(200);

    const r = await req('/auth/reset-password', { method: 'POST', body: { token: raw, password: newPw } });
    expect(r.status).toBe(200);

    expect((await req('/auth/me', { token: oldSession })).status).toBe(401);
    expect((await req('/auth/login', { method: 'POST', body: { email, password: oldPw } })).status).toBe(401);
    const fresh = await req('/auth/login', { method: 'POST', body: { email, password: newPw } });
    expect(fresh.status).toBe(201);
    expect((await req('/auth/me', { token: fresh.body.token })).status).toBe(200);

    // Повторно та же ссылка не работает, прочие ссылки пользователя удалены.
    const again = await req('/auth/reset-password', { method: 'POST', body: { token: raw, password: 'Another12345' } });
    expect(again.status).toBe(400);
    const left = await prisma.passwordResetToken.findMany({ where: { userId, usedAt: null } });
    expect(left).toHaveLength(0);
  });

  it('смена пароля в профиле тоже отзывает старые входы', async () => {
    const s1 = (await req('/auth/login', { method: 'POST', body: { email, password: newPw } })).body.token;
    await sleep(1100);
    const ch = await req('/users/me/password', {
      method: 'PATCH',
      token: s1,
      body: { currentPassword: newPw, newPassword: 'Third12345' },
    });
    expect(ch.status).toBe(200);
    expect((await req('/auth/me', { token: s1 })).status).toBe(401);
    const s2 = await req('/auth/login', { method: 'POST', body: { email, password: 'Third12345' } });
    expect((await req('/auth/me', { token: s2.body.token })).status).toBe(200);
  });
});
