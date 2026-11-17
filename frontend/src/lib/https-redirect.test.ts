import { describe, expect, it } from 'vitest';
import { httpsRedirect } from './https-redirect';

describe('httpsRedirect', () => {
  it('http уводится на https с тем же путём и запросом', () => {
    expect(httpsRedirect('http://vethub.uz/catalog?q=1')).toBe('https://vethub.uz/catalog?q=1');
    expect(httpsRedirect('http://www.vethub.uz/')).toBe('https://www.vethub.uz/');
  });

  // Ровно это и сломалось бы при петле: https не должен перенаправляться.
  it('https не трогается', () => {
    expect(httpsRedirect('https://vethub.uz/')).toBeNull();
    expect(httpsRedirect('https://vethub.uz/catalog')).toBeNull();
  });

  it('локальный запуск по http не перенаправляется', () => {
    expect(httpsRedirect('http://localhost:8787/')).toBeNull();
    expect(httpsRedirect('http://127.0.0.1:8787/')).toBeNull();
  });
});
