// Поля оффера из строки прайса.
//
// Правило одно: в оффер попадает только то, что в файле действительно есть.
// Раньше поля собирались без этой проверки, и повторная загрузка прайса
// затирала всё, чего в файле не оказалось: срок годности, номер серии, номер
// регистрации, срок поставки, остаток. Продавец, заливший прайс из одних цен,
// терял сведения, которые для ветпрепаратов обязательны, и восстановить их было
// уже неоткуда.
//
// Карточка товара так себя не вела: там фотографии и описание сохранялись
// осознанно. Оффер просто забыли — поэтому правило вынесено сюда и одинаково
// для всех полей.

import { parseBool, parseDate, parseNumber } from './parse';

// Значение колонки: undefined — колонки в файле нет или ячейка пуста, и тогда
// поле не трогаем. Пустая ячейка намеренно приравнена к отсутствию: прайсы
// приходят с пропусками, и пропуск означает «не знаю», а не «очисти».
export type RowValues = Partial<Record<string, string | undefined>>;

export interface OfferFields {
  // Что явно задано в файле — применяется и при создании, и при обновлении.
  provided: Record<string, unknown>;
  // Значения по умолчанию для нового оффера: у существующего они уже свои.
  defaults: Record<string, unknown>;
}

const DEFAULTS: Record<string, unknown> = {
  priceUnitQty: 1,
  packSize: 1,
  minOrder: 1,
  isRx: false,
  inStock: true,
};

export function offerFieldsFromRow(values: RowValues, price: number): OfferFields {
  const provided: Record<string, unknown> = { price };

  const text = (key: string, field = key) => {
    const v = values[key];
    if (v != null && v !== '') provided[field] = v;
  };
  const num = (key: string, field = key) => {
    const v = values[key];
    if (v == null || v === '') return undefined;
    const n = parseNumber(v);
    if (n != null) provided[field] = n;
    return n ?? undefined;
  };

  text('priceUnit');
  num('priceUnitQty');
  num('packSize');
  text('packUnit');
  num('minOrder');
  num('leadTimeDays');
  text('batchNumber');
  text('regNumber');

  // Остаток задаёт наличие — так же, как это делает выгрузка из 1С. Ноль в
  // прайсе означает «нет на складе», а не «в наличии»: иначе покупатель заказал
  // бы то, чего у продавца нет.
  const stock = num('stockQty');
  if (stock != null) provided.inStock = stock > 0;

  // Дата разбирается строго: «13.13.2026» это не декабрь, а ошибка в прайсе, и
  // подставлять вместо неё что-то правдоподобное нельзя — срок годности
  // ветпрепарата решает, можно ли его продавать.
  const expiry = values.expiryDate;
  if (expiry != null && expiry !== '') {
    const d = parseDate(expiry);
    if (d) provided.expiryDate = d;
  }

  const rx = values.isRx;
  if (rx != null && rx !== '') {
    const b = parseBool(rx);
    if (b != null) provided.isRx = b;
  }

  return { provided, defaults: DEFAULTS };
}
