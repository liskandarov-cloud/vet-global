// Срок годности партии на витрине и в кабинете продавца.
//
// Источник истины — бэкенд (common/visibility): истёкшую партию он покупателю
// не отдаёт и заказ по ней отклоняет, а «короткий срок» помечает флагом
// shortDated (порог SHORT_DATED_DAYS, по умолчанию 90 дней). Здесь — только
// подпись: флаг бэкенда берётся как есть, расчёт по дате — запасной путь для
// ответа без флага.
export const SHORT_DATED_DAYS = 90;
const DAY = 86_400_000;

export interface ExpiryInfo {
  label: string; // дд.мм.гггг
  until: string; // дд.мм — для бейджа «Короткий срок: до …»
  expired: boolean;
  short: boolean;
}

// Даты сроков — календарные (полночь UTC), поэтому и подпись по UTC:
// иначе у часового пояса западнее Гринвича срок съезжал бы на день раньше.
export function expiryInfo(
  iso: string | null | undefined,
  opts: { shortDated?: boolean; now?: number } = {},
): ExpiryInfo | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const now = opts.now ?? Date.now();
  const expired = d.getTime() <= now;
  const short = !expired && (opts.shortDated ?? d.getTime() - now < SHORT_DATED_DAYS * DAY);
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return { label: `${dd}.${mm}.${d.getUTCFullYear()}`, until: `${dd}.${mm}`, expired, short };
}
