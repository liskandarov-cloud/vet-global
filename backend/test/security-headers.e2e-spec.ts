// Заголовки защиты отдаются на живом API, а версия фреймворка — нет.
export {};

const BASE = process.env.API_URL ?? 'http://localhost:8000/api';

describe('Заголовки защиты API', () => {
  it('JSON-ответ: CSP, nosniff, HSTS, запрет встраивания, без X-Powered-By', async () => {
    const res = await fetch(`${BASE}/health`);
    expect(res.headers.get('content-security-policy')).toBe("default-src 'none'; frame-ancestors 'none'");
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('strict-transport-security')).toMatch(/max-age=/);
    expect(res.headers.get('x-frame-options')).toBe('DENY');
    expect(res.headers.get('x-powered-by')).toBeNull();
  });

  it('ошибки тоже с заголовками', async () => {
    const res = await fetch(`${BASE}/no-such-route`);
    expect(res.status).toBe(404);
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('CORS для витрины не сломан', async () => {
    // Тот же источник, что разрешает сервер: из окружения или умолчание кода.
    const origin = (process.env.CORS_ORIGINS ?? '').split(',')[0].trim() || process.env.FRONTEND_URL || 'https://vethub.uz';
    const res = await fetch(`${BASE}/categories`, { headers: { Origin: origin } });
    expect(res.status).toBe(200);
    expect(res.headers.get('access-control-allow-origin')).toBe(origin);
  });
});
