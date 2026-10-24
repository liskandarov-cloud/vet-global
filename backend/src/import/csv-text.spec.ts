import { decodeCsv, detectDelimiter } from './csv-text';

const ROWS = 'Код;Наименование;Цена\r\n00012;Ивермек 1% 50 мл;48 500\r\n00013;Энрофлон 10%;67250,50\r\n';

describe('decodeCsv', () => {
  it('Excel с русской локалью: Windows-1251 и точка с запятой', () => {
    const buf = Buffer.from(new Uint8Array([...ROWS].map((c) => win1251(c))));
    const r = decodeCsv(buf);
    expect(r.encoding).toBe('windows-1251');
    expect(r.delimiter).toBe(';');
    expect(r.text).toContain('Ивермек');
  });

  it('UTF-8 с BOM: метка срезается', () => {
    const r = decodeCsv(Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(ROWS, 'utf8')]));
    expect(r.encoding).toBe('utf-8');
    expect(r.text.startsWith('Код')).toBe(true);
    expect(r.delimiter).toBe(';');
  });

  it('«Юникод-текст» Excel: UTF-16 с табуляцией', () => {
    const tsv = 'Наименование\tЦена\r\nИвермек\t48500\r\n';
    const r = decodeCsv(Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(tsv, 'utf16le')]));
    expect(r.encoding).toBe('utf-16le');
    expect(r.delimiter).toBe('\t');
    expect(r.text).toContain('Ивермек');
  });

  it('обычный CSV с запятой остаётся как был', () => {
    const r = decodeCsv(Buffer.from('name,price\nIvermek,48500\n', 'utf8'));
    expect(r).toEqual({ text: 'name,price\nIvermek,48500\n', delimiter: ',', encoding: 'utf-8' });
  });
});

describe('detectDelimiter', () => {
  it('запятая в десятичной цене не сбивает: точка с запятой есть в каждой строке', () => {
    expect(detectDelimiter(ROWS)).toBe(';');
  });

  it('разделители внутри кавычек не считаются', () => {
    expect(detectDelimiter('"Вакцина; 1000 доз, флакон",100\n"Ивермек; 50 мл",200\n')).toBe(',');
  });

  it('одна колонка — запятая по умолчанию', () => {
    expect(detectDelimiter('Наименование\nИвермек\n')).toBe(',');
  });
});

// Кодирование одного символа в Windows-1251 для теста: кириллица А–я идёт
// подряд с 0xC0, Ё/ё и знак № — отдельно.
function win1251(c: string): number {
  const code = c.charCodeAt(0);
  if (code < 0x80) return code;
  if (code >= 0x410 && code <= 0x44f) return code - 0x410 + 0xc0;
  if (c === 'Ё') return 0xa8;
  if (c === 'ё') return 0xb8;
  if (c === '№') return 0xb9;
  throw new Error(`нет в тестовой таблице: ${c}`);
}
