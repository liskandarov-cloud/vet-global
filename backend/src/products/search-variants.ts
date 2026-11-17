// Варианты поискового запроса.
//
// Карточки в основном на русском, а покупатель в регионах пишет латиницей —
// по-узбекски («ivermektin») или как на упаковке импортного препарата
// («ivermectin»). Обычный поиск по вхождению таких запросов не находил.
// Здесь запрос раскладывается на варианты: как набрали, кириллицей, латиницей,
// и с заменой c↔k, которой различаются латинское и русское написания МНН.
//
// shortcut: опечатки (кроме c↔k) не прощаются; когда каталог вырастет —
// pg_trgm с индексом по названию.

const LAT_MULTI: [string, string][] = [
  ['shch', 'щ'],
  ['sh', 'ш'],
  ['ch', 'ч'],
  ['zh', 'ж'],
  ['kh', 'х'],
  ['ts', 'ц'],
  ['yo', 'ё'],
  ['yu', 'ю'],
  ['ya', 'я'],
  ['ye', 'е'],
  // Узбекские oʻ и gʻ — в русском написании о и г; апостроф бывает любым.
  ["o'", 'о'],
  ['oʻ', 'о'],
  ['o‘', 'о'],
  ['o`', 'о'],
  ["g'", 'г'],
  ['gʻ', 'г'],
  ['g‘', 'г'],
  ['g`', 'г'],
];

const LAT_SINGLE: Record<string, string> = {
  a: 'а', b: 'б', c: 'ц', d: 'д', e: 'е', f: 'ф', g: 'г', h: 'х', i: 'и', j: 'ж',
  k: 'к', l: 'л', m: 'м', n: 'н', o: 'о', p: 'п', q: 'к', r: 'р', s: 'с', t: 'т',
  u: 'у', v: 'в', w: 'в', x: 'кс', y: 'й', z: 'з',
};

const CYR: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z', и: 'i',
  й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
  у: 'u', ф: 'f', х: 'x', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sh', ъ: '', ы: 'i', ь: '',
  э: 'e', ю: 'yu', я: 'ya', ў: 'o', қ: 'q', ғ: 'g', ҳ: 'h',
};

export function latToCyr(s: string): string {
  let out = '';
  let i = 0;
  const lower = s.toLowerCase();
  outer: while (i < lower.length) {
    for (const [lat, cyr] of LAT_MULTI) {
      if (lower.startsWith(lat, i)) {
        out += cyr;
        i += lat.length;
        continue outer;
      }
    }
    const ch = lower[i];
    out += LAT_SINGLE[ch] ?? ch;
    i += 1;
  }
  return out;
}

export function cyrToLat(s: string): string {
  return [...s.toLowerCase()].map((ch) => CYR[ch] ?? ch).join('');
}

const hasLatin = (s: string) => /[a-z]/i.test(s);
const hasCyrillic = (s: string) => /[а-яёўқғҳ]/i.test(s);

export function searchVariants(query: string): string[] {
  const q = query.trim().replace(/\s+/g, ' ');
  if (!q) return [];
  const out = [q];
  if (hasLatin(q)) {
    out.push(latToCyr(q));
    // «ivermectin» по-русски «ивермектин»: латинская c в МНН читается как к.
    if (/c/i.test(q)) out.push(latToCyr(q.replace(/c/gi, 'k')));
  }
  if (hasCyrillic(q)) {
    const lat = cyrToLat(q);
    out.push(lat);
    if (lat.includes('k')) out.push(lat.replace(/k/g, 'c'));
  }
  return [...new Set(out.map((v) => v.toLowerCase()))].filter((v) => v.length >= 2);
}
