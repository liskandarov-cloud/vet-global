import { parseNumber, parseImages, parseBool, parseDate, parseAnimal } from './parse';
import { AnimalType } from '@prisma/client';

describe('parseNumber — цена и количества из прайса', () => {
  it('простое целое', () => {
    expect(parseNumber('1250')).toBe(1250);
    expect(parseNumber('0')).toBe(0);
  });

  it('пробелы как разделитель тысяч', () => {
    expect(parseNumber('12 500')).toBe(12500);
    expect(parseNumber('1 234 567')).toBe(1234567);
  });

  it('запятая как десятичный разделитель — один-два знака до конца', () => {
    expect(parseNumber('1250,5')).toBe(1250.5);
    expect(parseNumber('1250,50')).toBe(1250.5);
  });

  it('запятая как разделитель тысяч — три знака', () => {
    // «1,250» это тысяча двести пятьдесят, а не один и двести пятьдесят тысячных
    expect(parseNumber('1,250')).toBe(1250);
  });

  it('английский формат: запятая тысячи, точка дробь', () => {
    expect(parseNumber('1,250.50')).toBe(1250.5);
  });

  it('европейский формат: точка тысячи, запятая дробь', () => {
    expect(parseNumber('1.250,50')).toBe(1250.5);
  });

  it('валюта и прочий текст отбрасываются', () => {
    expect(parseNumber('12 500 сум')).toBe(12500);
    expect(parseNumber('UZS 9 900')).toBe(9900);
  });

  it('пустое и нечисловое дают null, а не ноль', () => {
    // Ноль вместо null означал бы бесплатный товар в каталоге.
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('—')).toBeNull();
    expect(parseNumber('нет в наличии')).toBeNull();
    expect(parseNumber(undefined as any)).toBeNull();
  });

  it('битые числа дают null', () => {
    expect(parseNumber('1.2.3')).toBeNull();
    expect(parseNumber('1-2')).toBeNull();
  });

  it('отрицательное значение разбирается как есть', () => {
    // Валидацию знака делает вызывающий код, разбор лишь честно читает ввод.
    expect(parseNumber('-5')).toBe(-5);
  });
});

describe('parseImages — ссылки на фото', () => {
  it('разделители: запятая, точка с запятой, перенос строки', () => {
    expect(parseImages('https://a.uz/1.jpg, https://a.uz/2.jpg')).toEqual([
      'https://a.uz/1.jpg',
      'https://a.uz/2.jpg',
    ]);
    expect(parseImages('https://a.uz/1.jpg;https://a.uz/2.jpg')).toHaveLength(2);
    expect(parseImages('https://a.uz/1.jpg\nhttps://a.uz/2.jpg')).toHaveLength(2);
  });

  it('относительные пути допускаются', () => {
    expect(parseImages('/uploads/foto.jpg')).toEqual(['/uploads/foto.jpg']);
  });

  it('мусор из соседних колонок отбрасывается', () => {
    // Без фильтра в базу попадали бы названия и артикулы.
    expect(parseImages('фото есть, ftp://a.uz/x.jpg, артикул 123')).toEqual([]);
  });

  it('пустое значение даёт пустой список, а не null', () => {
    expect(parseImages('')).toEqual([]);
  });
});

describe('parseBool — признаки вроде рецептурности', () => {
  it('распознаёт утверждение на трёх языках и знаками', () => {
    for (const v of ['да', 'Ha', 'YES', 'true', '1', '+', 'Rx', ' да ']) {
      expect(parseBool(v)).toBe(true);
    }
  });

  it('всё остальное непустое — отрицание', () => {
    expect(parseBool('нет')).toBe(false);
    expect(parseBool('yo')).toBe(false);
    expect(parseBool('0')).toBe(false);
  });

  it('пустое значение — null, чтобы отличать «не указано» от «нет»', () => {
    expect(parseBool('')).toBeNull();
  });
});

describe('parseDate — срок годности', () => {
  it('ДД.ММ.ГГГГ, самый частый формат в узбекских прайсах', () => {
    const d = parseDate('31.12.2026')!;
    expect(d.getUTCFullYear()).toBe(2026);
    expect(d.getUTCMonth()).toBe(11);
    expect(d.getUTCDate()).toBe(31);
  });

  it('разделителями могут быть точка, слеш и дефис', () => {
    expect(parseDate('01/02/2026')!.getUTCMonth()).toBe(1);
    expect(parseDate('01-02-2026')!.getUTCMonth()).toBe(1);
  });

  it('двузначный год трактуется как двухтысячный', () => {
    expect(parseDate('05.06.27')!.getUTCFullYear()).toBe(2027);
  });

  it('дата собирается в UTC, а не в локальной зоне', () => {
    // new Date(год, месяц, день) даёт полночь по локальному времени, и один и
    // тот же прайс, загруженный в Ташкенте и на сервере в UTC, давал бы даты,
    // расходящиеся на сутки.
    expect(parseDate('31.12.2026')!.toISOString()).toBe('2026-12-31T00:00:00.000Z');
  });

  it('несуществующий месяц отбрасывается, а не переносится на следующий год', () => {
    // До проверки «13.13.2026» молча превращалось в 12 января 2027.
    expect(parseDate('13.13.2026')).toBeNull();
  });

  it('несуществующий день отбрасывается, а не обрезается', () => {
    // До проверки «32.01.2026» молча становилось 31 января.
    expect(parseDate('32.01.2026')).toBeNull();
    expect(parseDate('00.01.2026')).toBeNull();
  });

  it('29 февраля в невисокосном году отбрасывается', () => {
    // До проверки становилось 28 февраля — неверный срок годности.
    expect(parseDate('29.02.2025')).toBeNull();
    // В високосном году дата настоящая и остаётся.
    expect(parseDate('29.02.2024')!.getUTCDate()).toBe(29);
  });

  it('пустое значение — null', () => {
    expect(parseDate('')).toBeNull();
  });

  it('неразбираемый текст — null', () => {
    expect(parseDate('скоро')).toBeNull();
  });
});

describe('parseAnimal — вид животного по свободному тексту', () => {
  it('птица', () => {
    for (const v of ['Птица', 'птицы', 'бройлер', 'parranda', 'poultry', 'курица']) {
      expect(parseAnimal(v)).toBe(AnimalType.POULTRY);
    }
  });

  it('КРС', () => {
    for (const v of ['КРС', 'коровы', 'крупный рогатый скот', 'qoramol', 'cattle', 'телёнок']) {
      expect(parseAnimal(v)).toBe(AnimalType.CATTLE);
    }
  });

  it('ё и е считаются одной буквой', () => {
    // В прайсах пишут и «телёнок», и «теленок».
    expect(parseAnimal('теленок')).toBe(AnimalType.CATTLE);
    expect(parseAnimal('телёнок')).toBe(AnimalType.CATTLE);
  });

  it('МРС, лошади, домашние животные', () => {
    expect(parseAnimal('овцы')).toBe(AnimalType.SMALL_RUMINANTS);
    expect(parseAnimal('echki')).toBe(AnimalType.SMALL_RUMINANTS);
    expect(parseAnimal('лошади')).toBe(AnimalType.HORSES);
    expect(parseAnimal('собаки и кошки')).toBe(AnimalType.PETS);
  });

  it('незнакомый вид — OTHER, но не null', () => {
    // Товар должен попасть в каталог, пусть и без точного вида.
    expect(parseAnimal('рыбы')).toBe(AnimalType.OTHER);
  });

  it('пустое значение — null, чтобы поле не заполнялось вовсе', () => {
    expect(parseAnimal('')).toBeNull();
  });
});
