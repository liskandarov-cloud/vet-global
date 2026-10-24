import { corsOrigins, DEFAULT_FRONTEND_URL, frontendUrl } from './frontend-url';

describe('frontendUrl', () => {
  it('из окружения, а без него — публичный адрес витрины', () => {
    expect(frontendUrl({ FRONTEND_URL: 'https://vethub.uz' })).toBe('https://vethub.uz');
    expect(frontendUrl({})).toBe(DEFAULT_FRONTEND_URL);
    expect(frontendUrl({ FRONTEND_URL: '  ' })).toBe(DEFAULT_FRONTEND_URL);
  });
});

describe('corsOrigins', () => {
  // Раньше без переменных CORS не пускал никого: сайт не мог обратиться к API.
  it('без переменных пускает витрину, а не никого', () => {
    expect(corsOrigins({})).toEqual({ origins: [DEFAULT_FRONTEND_URL], allowAll: false });
  });

  it('CORS_ORIGINS списком через запятую важнее FRONTEND_URL', () => {
    expect(corsOrigins({ CORS_ORIGINS: 'https://a.uz, https://b.uz', FRONTEND_URL: 'https://c.uz' })).toEqual({
      origins: ['https://a.uz', 'https://b.uz'],
      allowAll: false,
    });
    expect(corsOrigins({ FRONTEND_URL: 'https://c.uz' }).origins).toEqual(['https://c.uz']);
  });

  it('звёздочка — только явно', () => {
    expect(corsOrigins({ CORS_ORIGINS: '*' }).allowAll).toBe(true);
  });
});
