// Воркер vethub-api-edge перед api.vethub.uz: кэш публичного каталога и
// файлов на краю Cloudflare. Что кэшировать — src/lib/edge-cache.ts; маршруты
// и выкатка — wrangler.edge-api.jsonc.
//
// Запрос к api.vethub.uz изнутри воркера идёт к источнику (Render), а не в
// этот же воркер. Всё, что правила не кэшируют, проходит как есть.
//
// shortcut: воркер на маршруте считается в лимит бесплатного плана — 100 тыс.
// запросов в сутки на аккаунт вместе с сайтом; страница каталога — около 15.
// При росте трафика перейти на Cache Rule в зоне (нужен токен с правом
// Cache Rules) — он бесплатен и вне лимита.
import { edgeCachePolicy } from './src/lib/edge-cache';

interface Ctx {
  waitUntil(p: Promise<unknown>): void;
}

const edgeCache = () => (caches as unknown as { default: Cache }).default;

const worker = {
  async fetch(request: Request, _env: unknown, ctx: Ctx): Promise<Response> {
    const policy = edgeCachePolicy(request.method, request.url, request.headers);
    if (!policy) return fetch(request);

    const key = new Request(policy.key, { method: 'GET' });
    const hit = await edgeCache().match(key);
    if (hit) return withHeaders(hit, 'HIT', policy.browserCacheControl);

    const res = await fetch(request);
    // Кэшируем только удачный ответ: 404 скрытого товара или 5xx спящего
    // Render не должны жить минуту.
    if (res.status !== 200) return res;

    const stored = new Response(res.clone().body, res);
    stored.headers.set('cache-control', `public, max-age=${policy.ttl}`);
    // Источник уже в ключе; Vary: Origin мешал бы находить запись.
    stored.headers.delete('vary');
    stored.headers.delete('set-cookie');
    ctx.waitUntil(edgeCache().put(key, stored));
    return withHeaders(res, 'MISS', policy.browserCacheControl);
  },
};

function withHeaders(res: Response, state: 'HIT' | 'MISS', browserCacheControl: string | null): Response {
  const out = new Response(res.body, res);
  out.headers.set('x-edge-cache', state);
  if (browserCacheControl) out.headers.set('cache-control', browserCacheControl);
  return out;
}

export default worker;
