// Первый заход по http — сразу на https; дальше браузер помнит это по HSTS.
//
// Проверяется в обёртке воркера (worker.ts), а не в next.config: внутри
// OpenNext заголовок X-Forwarded-Proto равен http на любом запросе, и правило
// на нём зациклило сайт. У самого воркера request.url хранит исходную схему.
export function httpsRedirect(url: string): string | null {
  const u = new URL(url);
  if (u.protocol !== 'http:') return null;
  // Локальный запуск (wrangler dev) работает по http.
  if (u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname.endsWith('.localhost')) return null;
  u.protocol = 'https:';
  return u.toString();
}
