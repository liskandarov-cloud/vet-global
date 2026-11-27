// Описание товара — простой текст. Строки вида «Показания: …» показываются
// на странице товара таблицей «Характеристики», остальные строки — абзацами.
// Метка — одно-два слова с заглавной буквы, без цифр и скобок, — чтобы обычная
// фраза с двоеточием («Ichish uchun eritma: …») осталась текстом.
const ROW = /^(\p{Lu}[^:\d()\s]{0,23}(?: [^:\d()\s]{1,23})?):\s+(.+)$/u;

export function splitDescription(text: string): { paras: string[]; rows: [string, string][] } {
  const paras: string[] = [];
  const rows: [string, string][] = [];
  for (const line of text.split('\n').map((l) => l.trim()).filter(Boolean)) {
    const m = line.match(ROW);
    if (m) rows.push([m[1], m[2]]);
    else paras.push(line);
  }
  return { paras, rows };
}

// Поля товара + строки описания. Строка описания, повторяющая поле
// («Форма выпуска: живая» и «Тип: Живая»), не дублируется.
export function mergeFacts(fields: [string, string | null | undefined][], rows: [string, string][]): [string, string][] {
  const set = fields.filter((f): f is [string, string] => !!f[1]);
  const seen = new Set(set.map(([, v]) => v.toLowerCase()));
  return [...set, ...rows.filter(([, v]) => !seen.has(v.toLowerCase()))];
}

export const hasCyrillic = (s: string) => /[А-Яа-яЁё]/.test(s);

// Кириллица → латиница для имён собственных на узбекских страницах
// («НПЦ БелАгроГен (Беларусь)» → «NPTs BelAgroGen (Belarus)»).
const LAT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm',
  н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'x', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sh',
  ъ: '', ы: 'i', ь: '', э: 'e', ю: 'yu', я: 'ya',
};
export const latin = (s: string) =>
  s.replace(/[А-Яа-яЁё]/g, (c) => {
    const l = LAT[c.toLowerCase()];
    return c === c.toLowerCase() ? l : l.charAt(0).toUpperCase() + l.slice(1);
  });

// Для мета-описаний и сниппетов: строки склеиваются в предложения.
export const flatDescription = (text: string) => text.trim().replace(/\.?\s*\n+\s*/g, '. ');

export const ANIMALS: { value: string; label: [string, string] }[] = [
  { value: 'POULTRY', label: ['Птица', 'Parranda'] },
  { value: 'CATTLE', label: ['КРС', 'Yirik shoxli mol'] },
  { value: 'SMALL_RUMINANTS', label: ['МРС', 'Mayda shoxli mol'] },
  { value: 'HORSES', label: ['Лошади', 'Otlar'] },
  { value: 'PETS', label: ['Кошки/собаки', 'Mushuklar/itlar'] },
  { value: 'OTHER', label: ['Прочее', 'Boshqa'] },
];
