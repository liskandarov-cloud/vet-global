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
