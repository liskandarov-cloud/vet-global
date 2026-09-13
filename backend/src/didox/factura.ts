// Сборка счёта-фактуры для ЭДО.
//
// Вынесено из сервиса и не касается ни базы, ни сети: это документ налогового
// учёта, и ошибка в его составе — это расхождение отчётности, а не сбой. Именно
// здесь раньше были две: перечень строк не сходился с итогом на стоимость
// доставки, а ИНН покупателя не попадал в документ никогда.

import type { FacturaItem, FacturaPayload } from './didox.types';

export interface FacturaOrder {
  createdAt: Date;
  buyerName: string;
  buyerCompany?: string | null;
  deliveryCost?: unknown;
  items: { productName: string; quantity: number; price: unknown }[];
  counterparty?: { name?: string | null; inn?: string | null } | null;
  buyer?: { inn?: string | null } | null;
}

export interface FacturaSeller {
  inn?: string | null;
  company?: string | null;
}

export function buildFactura(
  order: FacturaOrder,
  seller: FacturaSeller | null,
  number: string,
): FacturaPayload {
  const goods: FacturaItem[] = order.items.map((it) => {
    const price = num(it.price);
    return {
      name: it.productName,
      quantity: it.quantity,
      price,
      total: round2(price * it.quantity),
    };
  });

  // Доставка — отдельной строкой, потому что входит в сумму к оплате. Пока её
  // не было в перечне, итог документа не сходился со строками ровно на её
  // стоимость, а сверяют в документе именно строки.
  const deliveryCost = num(order.deliveryCost);
  const items = deliveryCost > 0
    ? [...goods, { name: 'Доставка', quantity: 1, price: deliveryCost, total: deliveryCost }]
    : goods;

  return {
    facturaNo: number,
    facturaDate: order.createdAt.toISOString().slice(0, 10),
    seller: { tin: seller?.inn ?? null, name: seller?.company ?? null },
    // ИНН покупателя: из реквизитов контрагента, которыми оформлен заказ, иначе
    // из профиля. Для ЭДО он обязателен, а прежнее выражение давало undefined в
    // обеих ветках — то есть документ уходил без ИНН покупателя всегда.
    buyer: {
      tin: order.counterparty?.inn ?? order.buyer?.inn ?? null,
      name: order.counterparty?.name ?? order.buyerCompany ?? order.buyerName,
    },
    items,
    // Итог — сумма строк, и только она. Отдельно посчитанный итог рано или
    // поздно разойдётся с перечнем; здесь это уже случалось.
    //
    // Списанные баллы итог не уменьшают: их оплачивает платформа, продавцу
    // выплачивается полная стоимость позиций (см. отчёт по выплатам), поэтому и
    // реализация у него полная.
    total: round2(items.reduce((sum, it) => sum + it.total, 0)),
  };
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
