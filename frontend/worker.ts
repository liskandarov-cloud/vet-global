// Вход воркера: перенаправление http → https и дальше — сайт, собранный
// OpenNext (.open-next/worker.js появляется после opennextjs-cloudflare build).
// Классы Durable Objects реэкспортируются, иначе привязки OpenNext не найдут их.
// Файл исключён из tsconfig: до сборки импортируемого модуля нет.
import handler from './.open-next/worker.js';
import { httpsRedirect } from './src/lib/https-redirect';

export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from './.open-next/worker.js';

const worker = {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const to = httpsRedirect(request.url);
    if (to) return Response.redirect(to, 308);
    // Какая сборка реально отдаётся: uptime сверяет с main. BUILD_SHA задаёт
    // выкатка (`wrangler deploy --var BUILD_SHA:<коммит>`).
    if (new URL(request.url).pathname === '/__version') {
      const sha = (env as { BUILD_SHA?: string }).BUILD_SHA ?? null;
      return Response.json({ sha }, { headers: { 'cache-control': 'no-store' } });
    }
    return (handler as { fetch: (r: Request, e: unknown, c: unknown) => Promise<Response> }).fetch(request, env, ctx);
  },
};

export default worker;
