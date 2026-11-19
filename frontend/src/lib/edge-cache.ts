// Что кэшировать на краю Cloudflare перед API (воркер edge-api.ts).
//
// API — бесплатный Render в Орегоне, покупатели — в Узбекистане: каждый
// запрос каталога и каждая из дюжины картинок на странице ехали через океан,
// а Cloudflare их не кэшировал (cf-cache-status: DYNAMIC — у /api/files/:id
// нет расширения файла, у JSON нет заголовков кэша).
//
// Кэшируется только то, что одинаково для всех: анонимный GET публичного
// каталога. Запрос с токеном (договорные цены, кабинеты) и любой не-GET идут
// мимо кэша, как раньше.

// Публичные разделы, которые читает витрина без входа.
const PUBLIC_JSON = ['/api/products', '/api/categories', '/api/sellers', '/api/brands', '/api/promotions', '/api/blog', '/api/reviews'];
const FILES = '/api/files/';

// Файл не меняется (id — uuid), каталог допускает задержку в минуту: столько
// после правки цены или одобрения продавца витрина может показывать прежнее.
export const FILE_TTL = 31536000;
export const JSON_TTL = 60;

export interface EdgePolicy {
  key: string;
  ttl: number;
  // Заголовок кэша для браузера. JSON браузеру не кэшируем: он держал бы
  // анонимный ответ по тому же адресу и после входа, когда цены уже другие.
  browserCacheControl: string | null;
}

export function edgeCachePolicy(method: string, url: string, headers: Headers): EdgePolicy | null {
  if (method !== 'GET') return null;
  if (headers.has('authorization') || headers.has('cookie')) return null;
  const u = new URL(url);
  if (u.pathname.startsWith(FILES)) {
    // Картинки одинаковы для всех источников, запрос и ключ — без параметров.
    return { key: `${u.origin}${u.pathname}`, ttl: FILE_TTL, browserCacheControl: null };
  }
  const isPublic = PUBLIC_JSON.some((p) => u.pathname === p || u.pathname.startsWith(`${p}/`));
  if (!isPublic) return null;
  // Origin — в ключе: ответ несёт CORS-заголовок своего источника, и ответ на
  // запрос без Origin (сервер, curl) сломал бы витрину, попади он в общий кэш.
  const origin = headers.get('origin') ?? '';
  const sep = u.search ? '&' : '?';
  return {
    key: `${u.origin}${u.pathname}${u.search}${sep}__edge_origin=${encodeURIComponent(origin)}`,
    ttl: JSON_TTL,
    browserCacheControl: 'no-store',
  };
}
