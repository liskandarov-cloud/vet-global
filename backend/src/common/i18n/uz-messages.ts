// Сообщения сервера на языке пользователя.
//
// Ошибки (нет в наличии, минимальный заказ, нет доступа…) писались только
// по-русски, а сайт показывает их покупателю как есть — в узбекском
// интерфейсе именно то, почему не прошёл заказ, оставалось непонятным. Сайт
// присылает выбранный язык заголовком Accept-Language, фильтр ошибок
// переводит ответ по словарю (uz-messages.data.ts). Сообщения в коде остаются
// русскими: так их видят логи, тесты и русский интерфейс.
import { UZ_MESSAGES } from './uz-messages.data';

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Сообщения с подстановками: литералы как есть, ${…} — любое значение.
const PATTERNS = Object.entries(UZ_MESSAGES)
  .filter(([ru]) => ru.includes('${'))
  .map(([ru, uz]) => ({
    re: new RegExp('^' + ru.split(/\$\{[^}]*\}/).map(escapeRe).join('(.+?)') + '$', 's'),
    uz,
  }));

export function translateToUz(message: string): string | null {
  const exact = UZ_MESSAGES[message];
  if (exact !== undefined && !message.includes('${')) return exact;
  for (const { re, uz } of PATTERNS) {
    const m = re.exec(message);
    if (m) return uz.replace(/\{(\d+)\}/g, (_, i: string) => m[Number(i)] ?? '');
  }
  return null;
}

// Первый язык в Accept-Language — тот, что выбран на сайте.
export function wantsUz(acceptLanguage: string | string[] | undefined): boolean {
  const v = Array.isArray(acceptLanguage) ? acceptLanguage[0] : acceptLanguage;
  return /^\s*uz\b/i.test(v ?? '');
}

// Тело ответа об ошибке: message — строка или список строк (валидация).
// Непереведённое остаётся как есть.
export function localizeErrorBody<T>(body: T): T {
  if (!body || typeof body !== 'object') return body;
  const msg = (body as { message?: unknown }).message;
  const tr = (s: unknown) => (typeof s === 'string' ? translateToUz(s) ?? s : s);
  if (typeof msg === 'string') return { ...body, message: tr(msg) };
  if (Array.isArray(msg)) return { ...body, message: msg.map(tr) };
  return body;
}
