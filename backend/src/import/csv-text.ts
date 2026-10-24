// Текст и разделитель CSV-прайса — такими, какими их сохраняет продавец.
//
// Раньше CSV читался как UTF-8 с запятой. Но Excel с русской локалью и 1С
// сохраняют CSV в Windows-1251 и с точкой с запятой — запятая у них десятичный
// разделитель. Такой файл, первое, что загрузит дистрибьютор, превращался в
// кракозябры одной колонкой, и автосопоставление не находило ничего.
//
// Кодировка: метка BOM, затем строгая проверка UTF-8, иначе Windows-1251.
// «Юникод-текст» Excel — это UTF-16 с табуляцией, его тоже узнаём по метке.

export interface CsvText {
  text: string;
  delimiter: string;
  encoding: 'utf-8' | 'utf-16le' | 'windows-1251';
}

const CANDIDATES = [';', '\t', ','] as const;
const SAMPLE_LINES = 10;

export function decodeCsv(buf: Buffer): CsvText {
  let text: string;
  let encoding: CsvText['encoding'];
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    text = buf.subarray(3).toString('utf8');
    encoding = 'utf-8';
  } else if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    text = new TextDecoder('utf-16le').decode(buf.subarray(2));
    encoding = 'utf-16le';
  } else {
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(buf);
      encoding = 'utf-8';
    } catch {
      text = new TextDecoder('windows-1251').decode(buf);
      encoding = 'windows-1251';
    }
  }
  return { text, delimiter: detectDelimiter(text), encoding };
}

// Разделитель — тот, что встречается в каждой из первых строк; при равенстве
// побеждает чаще встречающийся. Содержимое кавычек не считается: в названии
// препарата бывает и запятая, и точка с запятой.
export function detectDelimiter(text: string): string {
  const lines = text
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .slice(0, SAMPLE_LINES)
    .map((l) => l.replace(/"(?:[^"]|"")*"/g, ''));
  if (!lines.length) return ',';

  let best: string = ',';
  let bestScore = -1;
  for (const d of CANDIDATES) {
    const counts = lines.map((l) => l.split(d).length - 1);
    const everywhere = counts.every((c) => c > 0);
    const total = counts.reduce((a, b) => a + b, 0);
    // Встречается в каждой строке — главный признак разделителя.
    const score = (everywhere ? 1_000_000 : 0) + total;
    if (score > bestScore) {
      bestScore = score;
      best = d;
    }
  }
  return bestScore > 0 ? best : ',';
}
