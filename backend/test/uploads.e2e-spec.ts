// Загрузка файлов: тип определяется по содержимому, а не по словам клиента.
// Бакет публичный — всё, что в нём лежит, отдаётся с адреса площадки.

export {};

const BASE = process.env.API_URL ?? 'http://localhost:8000/api';

const login = async (email: string, password: string) => {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return (await res.json()).token as string;
};

// Минимальный настоящий PNG 1×1.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

async function upload(token: string, bytes: Buffer, filename: string, type: string, kind = 'image') {
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(bytes)], { type }), filename);
  const res = await fetch(`${BASE}/uploads?kind=${kind}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  return { status: res.status, body: await res.json() };
}

describe('Загрузка файлов', () => {
  let seller: string;

  beforeAll(async () => {
    seller = await login('seller@vetglobal.com', 'seller123');
  });

  it('HTML под видом картинки не принимается', async () => {
    const r = await upload(seller, Buffer.from('<!doctype html><h1>Вход в VetHub</h1>'), 'photo.png', 'image/png');
    expect(r.status).toBe(400);
  });

  // Два режима хранения: в S3 ссылка несёт расширение, из базы файл отдаётся
  // по /api/files/:id с типом в заголовке. В обоих тип — по содержимому.
  it('настоящая картинка ложится с типом по содержимому, а не по имени', async () => {
    const r = await upload(seller, PNG, 'photo.html', 'image/png');
    expect(r.status).toBe(201);
    const url: string = r.body.url;
    expect(url).not.toMatch(/\.html$/);
    const dbFile = /\/api\/files\/([\w-]+)$/.exec(url);
    if (dbFile) {
      const served = await fetch(`${BASE}/files/${dbFile[1]}`);
      expect(served.headers.get('content-type')).toBe('image/png');
      expect(served.headers.get('x-content-type-options')).toBe('nosniff');
    } else {
      expect(url).toMatch(/\.png$/);
    }
  });

  it('картинку нельзя выдать за сертификат', async () => {
    const r = await upload(seller, PNG, 'cert.pdf', 'application/pdf', 'certificate');
    expect(r.status).toBe(400);
  });
});
