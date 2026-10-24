// Разбор и проверка строки ценового фида из 1С/ERP продавца.
//
// Чистые функции, вынесенные из sync.service, чтобы покрыть тестами. Фид идёт
// без человека: ошибку в нём никто не увидит до тех пор, пока покупатель не
// заплатит неверную сумму. Поэтому сомнительное значение отклоняется с
// причиной в ответе, а не записывается «как получилось».

import { parseNumber } from '../import/parse';

export interface PriceItem {
  externalId: string;
  // Числом из JSON или строкой из CommerceML: «1 500,00», «1500.00».
  price?: number | string;
  quantity?: number | string;
  inStock?: boolean;
}

export interface PriceUpdate {
  price?: number;
  stockQty?: number;
  inStock?: boolean;
}

// Верхняя граница цены — по колонке Decimal(12, 2).
const MAX_PRICE = 9_999_999_999;

function toNumber(v: number | string): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  return parseNumber(String(v));
}

export function priceUpdateFrom(item: PriceItem): { update: PriceUpdate } | { error: string } {
  const update: PriceUpdate = {};

  if (item.price != null && item.price !== '') {
    const price = toNumber(item.price);
    // Ноль — не «бесплатно», а пустая ячейка в 1С: заказ по такой цене
    // отдал бы товар даром.
    if (price == null || price <= 0) return { error: `цена «${item.price}» — ожидается число больше нуля` };
    if (price > MAX_PRICE) return { error: `цена ${price} больше допустимой` };
    update.price = Math.round(price * 100) / 100;
  }

  if (item.quantity != null && item.quantity !== '') {
    const qty = toNumber(item.quantity);
    if (qty == null) return { error: `остаток «${item.quantity}» — ожидается число` };
    // Отрицательный остаток 1С показывает при пересорте или продаже в минус:
    // на складе этого нет, значит и продать нельзя.
    update.stockQty = Math.max(0, Math.floor(qty));
    update.inStock = update.stockQty > 0;
  } else if (typeof item.inStock === 'boolean') {
    update.inStock = item.inStock;
  }

  return { update };
}

// Минимальный разбор CommerceML (1С): <Предложение> → Ид / ЦенаЗаЕдиницу / Количество.
// Значения отдаются строками: формат числа разбирает priceUpdateFrom так же,
// как в прайсе. Раньше здесь стоял Number(), и «1 500,00» становилось NaN.
export function parseCommerceML(xml: string): PriceItem[] {
  const items: PriceItem[] = [];
  const offers = xml.match(/<Предложение>[\s\S]*?<\/Предложение>/g) ?? [];
  for (const o of offers) {
    const id = /<Ид>([^<]+)<\/Ид>/.exec(o)?.[1]?.trim();
    if (!id) continue;
    const price = /<ЦенаЗаЕдиницу>([^<]+)<\/ЦенаЗаЕдиницу>/.exec(o)?.[1]?.trim();
    const qty = /<Количество>([^<]+)<\/Количество>/.exec(o)?.[1]?.trim();
    items.push({ externalId: id, price, quantity: qty });
  }
  return items;
}
