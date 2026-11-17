// Коды ИКПУ (MXIK) — классификатор товаров и услуг налогового комитета
// (tasnif.soliq.uz). Без кода по товару нельзя выписать электронный
// счёт-фактуру и пробить фискальный чек, поэтому он хранится у товара и
// копируется в позицию заказа на момент продажи.

// Код ИКПУ — ровно 17 цифр. В прайсах его пишут с пробелами и дефисами,
// а Excel превращает в число и теряет ведущие нули — их восстанавливаем.
export function normalizeMxik(raw: unknown): string | null {
  if (raw == null) return null;
  const digits = String(raw).replace(/[\s\-.]/g, '');
  if (!/^\d+$/.test(digits)) return null;
  if (digits.length > 17) return null;
  return digits.length === 17 ? digits : digits.length >= 15 ? digits.padStart(17, '0') : null;
}

// Код упаковки (единицы измерения) из того же классификатора — до 20 цифр.
export function normalizePackageCode(raw: unknown): string | null {
  if (raw == null) return null;
  const digits = String(raw).replace(/\s/g, '');
  return /^\d{1,20}$/.test(digits) ? digits : null;
}

export const MXIK_PATTERN = /^\d{17}$/;
export const PACKAGE_CODE_PATTERN = /^\d{1,20}$/;
