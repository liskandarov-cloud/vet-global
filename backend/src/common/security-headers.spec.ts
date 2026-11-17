import { securityHeaders } from './security-headers';

describe('securityHeaders', () => {
  it('JSON-ответы API: строгая CSP и базовые заголовки', () => {
    const h = securityHeaders('/api/products');
    expect(h['Content-Security-Policy']).toBe("default-src 'none'; frame-ancestors 'none'");
    expect(h['X-Content-Type-Options']).toBe('nosniff');
    expect(h['Strict-Transport-Security']).toMatch(/max-age=\d+/);
    expect(h['X-Frame-Options']).toBe('DENY');
  });

  it('файлы и Swagger без CSP: PDF и интерфейс документации должны открываться', () => {
    expect(securityHeaders('/api/files/abc.pdf')['Content-Security-Policy']).toBeUndefined();
    expect(securityHeaders('/api/docs')['Content-Security-Policy']).toBeUndefined();
    expect(securityHeaders('/api/files/abc.pdf')['X-Content-Type-Options']).toBe('nosniff');
  });
});
