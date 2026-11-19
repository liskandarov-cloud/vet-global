// Журнал действий администратора: запись появляется только после успешного
// действия, с автором и целью, без секретов в параметрах; читать его может
// только администратор.

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

// Журнал пишется после ответа (audit.interceptor: void this.audit.record), и
// чтение сразу за действием иногда опережало запись — тест падал нестабильно.
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function auditEntry(token: string, targetId: string, action: string) {
  for (let i = 0; i < 20; i++) {
    const log = await req(`/admin/audit?targetType=User&targetId=${targetId}`, { token });
    const e = log.body.entries?.find((x: any) => x.action === action);
    if (e) return e;
    await sleep(100);
  }
  return undefined;
}

const login = async (email: string, password: string) =>
  (await req('/auth/login', { method: 'POST', body: { email, password } })).body.token as string;

describe('Журнал действий администратора', () => {
  let admin: string;
  let buyer: string;
  let sellerId: string;

  beforeAll(async () => {
    admin = await login('admin@vetglobal.com', ADMIN_PW);
    buyer = await login('buyer@vetglobal.com', 'buyer123');
    const r = await req('/auth/register', {
      method: 'POST',
      body: {
        email: `audit+${Date.now()}@vg.test`,
        password: 'secret123',
        fullName: 'Audit Seller',
        phone: '+998900000000',
        role: 'SELLER',
        acceptTerms: true,
      },
    });
    sellerId = r.body.user.id;
  });

  it('проверка продавца записывается с автором и целью', async () => {
    expect((await req(`/admin/users/${sellerId}/verify`, { method: 'PATCH', token: admin, body: { isVerified: true } })).status).toBe(200);
    const e = await auditEntry(admin, sellerId, 'user.verify');
    expect(e).toBeTruthy();
    expect(e.admin.email).toBe('admin@vetglobal.com');
    expect(e.details).toMatchObject({ isVerified: true });
  });

  it('неудавшееся действие в журнал не попадает', async () => {
    const ghost = '00000000-0000-0000-0000-000000000000';
    expect((await req(`/admin/users/${ghost}/ban`, { method: 'PATCH', token: admin, body: { isBanned: true } })).status).toBe(404);
    // Запись пишется после ответа: даём ей время появиться, если бы она была.
    await sleep(500);
    const log = await req(`/admin/audit?targetType=User&targetId=${ghost}`, { token: admin });
    expect(log.body.entries).toHaveLength(0);
  });

  it('пароль из провижининга в журнал не попадает', async () => {
    const email = `audit-prov+${Date.now()}@vg.test`;
    const r = await req('/maintenance/user', {
      method: 'POST',
      token: admin,
      body: { email, password: 'Provisioned123', fullName: 'Provisioned' },
    });
    expect(r.status).toBe(201);
    const e = await auditEntry(admin, r.body.id, 'user.provision');
    expect(e.details.email).toBe(email);
    expect(e.details.password).toBe('[скрыто]');
    expect(JSON.stringify(e)).not.toContain('Provisioned123');
  });

  it('журнал доступен только администратору', async () => {
    expect((await req('/admin/audit', { token: buyer })).status).toBe(403);
    expect((await req('/admin/audit')).status).toBe(401);
  });
});
