// Разбор значений из прайса продавца.
//
// Вынесено из import.service, чтобы покрыть тестами: сервис завязан на Prisma и
// файлы, а это чистые функции. Цена и срок годности здесь важнее всего — ошибка
// разбора означает неверную цену в каталоге или неверный срок на препарате.

import { AnimalType } from '@prisma/client';

// Число из текста прайса. Форматы в реальных файлах разные: «12 500»,
// «12,500.50», «12.500,50», «12 500 сум».
export function parseNumber(v: string): number | null {
  if (!v) return null;
  const cleaned = v
    .replace(/ /g, '')
    .replace(/[^\d.,-]/g, '')
    .replace(/\s/g, '');
  if (!cleaned) return null;
  // Запятая считается десятичным разделителем, только если после неё одна-две
  // цифры до конца строки. Иначе это разделитель тысяч: «1,250» — тысяча
  // двести пятьдесят, а «1,25» — один и двадцать пять сотых.
  const normalized = /,\d{1,2}$/.test(cleaned)
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned.replace(/[,\s]/g, '');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

// Ссылки на фото: через запятую, точку с запятой или перенос строки.
// Пропускаем только http(s) и относительные пути — иначе в базу попадут
// случайные строки из соседних колонок.
export function parseImages(v: string): string[] {
  if (!v) return [];
  return v
    .split(/[,\n;]+/)
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\//i.test(s) || s.startsWith('/'));
}

export function parseBool(v: string): boolean | null {
  if (!v) return null;
  return ['да', 'ha', 'yes', 'true', '1', '+', 'rx'].includes(v.toLowerCase().trim());
}

export function parseDate(v: string): Date | null {
  if (!v) return null;
  // ДД.ММ.ГГГГ — самый частый формат в узбекских прайсах.
  const m = v.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})$/);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);

    // Date.UTC, а не new Date(год, месяц, день): второй создаёт полночь по
    // локальному времени, и один и тот же прайс, загруженный в Ташкенте и на
    // сервере в UTC, давал бы даты, отличающиеся на сутки.
    const d = new Date(Date.UTC(year, month - 1, day));

    // Обратная проверка. new Date не ругается на тринадцатый месяц и 32-е
    // число, а молча переносит дату: «13.13.2026» превращалось в 12 января
    // 2027, «32.01.2026» — в 31 января, «29.02.2025» — в 28 февраля. Для
    // срока годности препарата неверная дата хуже отсутствующей, поэтому
    // такие значения отбрасываем.
    if (
      d.getUTCFullYear() !== year ||
      d.getUTCMonth() !== month - 1 ||
      d.getUTCDate() !== day
    ) {
      return null;
    }
    return d;
  }
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Вид животного по свободному тексту: в прайсах пишут и по-русски, и
// по-узбекски, и по-английски, часто сокращённо.
export function parseAnimal(v: string): AnimalType | null {
  if (!v) return null;
  const s = v.toLowerCase().replace(/ё/g, 'е');
  if (/птиц|parrand|poultry|куриц|бройлер/.test(s)) return AnimalType.POULTRY;
  if (/крс|коров|скот|cattle|qoramol|бык|телён|телен/.test(s)) return AnimalType.CATTLE;
  if (/мрс|овц|коз|sheep|goat|qoʻy|qoy|echki/.test(s)) return AnimalType.SMALL_RUMINANTS;
  if (/лошад|конь|horse|ot\b/.test(s)) return AnimalType.HORSES;
  if (/собак|кошк|пит[оo]мц|pet|dog|cat|it\b|mushuk/.test(s)) return AnimalType.PETS;
  return AnimalType.OTHER;
}
