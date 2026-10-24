// Адрес витрины и разрешённые источники CORS.
//
// Раньше без переменных окружения сервер вёл себя по-разному в каждом месте:
// CORS не пускал никого (браузер не мог обратиться к API с сайта), платежи
// возвращали покупателя на localhost:3000, бот подставлял свой адрес. При
// переезде на новый хостинг это означало, что сервер поднимается «рабочим»,
// но сайт с ним не работает, пока кто-то не вспомнит про три переменные.
//
// Адрес витрины публичный — он в sitemap и во всех ссылках, — поэтому
// умолчание живёт здесь, одно на весь код. FRONTEND_URL и CORS_ORIGINS
// по-прежнему его переопределяют.

export const DEFAULT_FRONTEND_URL = 'https://vetglobal-web.l-iskandarov.workers.dev';

type Env = Record<string, string | undefined>;

export function frontendUrl(env: Env = process.env): string {
  return env.FRONTEND_URL?.trim() || DEFAULT_FRONTEND_URL;
}

// Звёздочка допустима только для локальной отладки: вместе с credentials она
// отражала бы любой Origin, поэтому тогда credentials выключаются (main.ts).
export function corsOrigins(env: Env = process.env): { origins: string[]; allowAll: boolean } {
  const list = (env.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const origins = list.length ? list : [frontendUrl(env)];
  return { origins, allowAll: origins.includes('*') };
}
