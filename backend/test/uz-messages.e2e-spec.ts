// Ошибки сервера — на языке сайта (Accept-Language), против живого стека.
export {};

const BASE = process.env.API_URL ?? 'http://localhost:8000/api';
const get = async (path: string, lang?: string) => {
  const res = await fetch(BASE + path, { headers: lang ? { 'Accept-Language': lang } : {} });
  return { status: res.status, body: (await res.json()) as { message: unknown } };
};

describe('язык сообщений сервера', () => {
  const path = `/brands/no-such-brand-${Date.now()}`;

  it('по умолчанию и для ru — по-русски', async () => {
    expect((await get(path)).body.message).toBe('Бренд не найден');
    expect((await get(path, 'ru-RU,ru;q=0.9')).body.message).toBe('Бренд не найден');
  });

  it('для uz — по-узбекски, тот же код ответа', async () => {
    const r = await get(path, 'uz');
    expect(r.status).toBe(404);
    expect(r.body.message).toBe('Brend topilmadi');
  });
});
