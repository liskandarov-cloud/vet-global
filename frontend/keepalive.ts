// Воркер vethub-keepalive: будит API по крону Cloudflare (wrangler.keepalive.jsonc).
//
// Бесплатный Render засыпает через 15 минут без запросов, и первый покупатель
// ждал пробуждения 30–60 секунд. Будил его workflow GitHub по расписанию
// «каждые 10 минут», но GitHub выполнял его раз в 5–6 часов — сервис спал
// большую часть суток. Крон Cloudflare срабатывает в срок.
//
// Запрос — к каталогу, а не к /api/health: он доходит до базы, а Supabase на
// бесплатном тарифе ставит на паузу проект без активности. Параметр делает
// каждый пинг промахом кэша на краю (edge-api.ts), иначе до API он не дошёл бы.

interface Ctx {
  waitUntil(p: Promise<unknown>): void;
}

const KEEPALIVE_URL = 'https://api.vethub.uz/api/categories';

const worker = {
  async scheduled(_event: unknown, _env: unknown, ctx: Ctx) {
    ctx.waitUntil(
      fetch(`${KEEPALIVE_URL}?keepalive=${Date.now()}`, { signal: AbortSignal.timeout(90_000) })
        .then((r) => r.arrayBuffer())
        .catch(() => undefined),
    );
  },
};

export default worker;
