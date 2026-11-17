// Ключ города для сравнения тарифа и адреса.
//
// Покупатель в узбекском интерфейсе пишет «Toshkent», продавец завёл тариф
// «Ташкент» — буквальное сравнение их не сводило, и покупателю из столицы
// доставались цены «для остальных городов». Здесь написания областных
// центров (русское, узбекское латиницей и кириллицей, английское) сводятся к
// одному ключу; прочие города сравниваются после общей нормализации.

const ALIASES: Record<string, string[]> = {
  tashkent: ['ташкент', 'toshkent', 'тошкент', 'tashkent'],
  samarkand: ['самарканд', 'samarqand', 'самарқанд', 'samarkand'],
  bukhara: ['бухара', 'buxoro', 'бухоро', 'bukhara'],
  namangan: ['наманган', 'namangan'],
  andijan: ['андижан', 'andijon', 'андижон', 'andijan'],
  fergana: ['фергана', 'fargona', 'фарғона', 'фаргона', 'fergana', 'ferghana'],
  nukus: ['нукус', 'nukus'],
  karshi: ['карши', 'qarshi', 'қарши', 'karshi'],
  termez: ['термез', 'termiz', 'термиз', 'termez'],
  urgench: ['ургенч', 'урганч', 'urganch', 'urgench'],
  navoi: ['навои', 'navoiy', 'навоий', 'navoi'],
  jizzakh: ['джизак', 'jizzax', 'жиззах', 'jizzakh', 'dzhizak'],
  gulistan: ['гулистан', 'guliston', 'гулистон', 'gulistan'],
};

const BY_ALIAS = new Map<string, string>(
  Object.entries(ALIASES).flatMap(([key, names]) => names.map((n) => [n, key] as [string, string])),
);

function normalize(city: string): string {
  return city
    .toLowerCase()
    .trim()
    .replace(/ё/g, 'е')
    .replace(/[ʻʼ‘’`']/g, '')
    .replace(/^(г\.|г |город |gorod |sh\.)\s*/, '')
    .replace(/\s+(шаҳри|шахри|shahri|город|г\.?)$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function cityKey(city?: string | null): string {
  const n = normalize(city ?? '');
  return BY_ALIAS.get(n) ?? n;
}
