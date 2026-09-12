// Подбор тарифа доставки и расчёт стоимости.
//
// Чистые функции: у сервиса доставки есть база и проверки доступа, а это —
// арифметика и выбор подходящей строки, и ошибка здесь означает неверную сумму
// в заказе. Веса и объёма у товаров нет, поэтому тариф опирается на способ
// доставки и город.

import { DeliveryMethod } from '@prisma/client';

export interface Tariff {
  method: DeliveryMethod;
  // Пустая строка — тариф по умолчанию для всех городов, кроме перечисленных.
  city?: string | null;
  cost: number;
  // Порог бесплатной доставки; пусто — бесплатной доставки нет.
  freeFrom?: number | null;
  isActive?: boolean;
}

// Сравнение городов: в прайсах и адресах пишут «Ташкент», «ташкент», « Ташкент ».
function sameCity(a?: string | null, b?: string | null): boolean {
  return (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase();
}

// Тариф без города — тот, что применяется ко всем городам, кроме перечисленных.
//
// Проверяется после обрезки пробелов: сервис приводит город к пустой строке, но
// строка из одних пробелов может прийти из импорта или правки в базе, и без
// обрезки такой тариф не выбирался бы вовсе — ни как точный, ни как общий.
function isDefaultCity(city?: string | null): boolean {
  return !(city ?? '').trim();
}

// Тариф для способа и города: сперва точное совпадение города, затем тариф по
// умолчанию. Точный важнее: «Ташкент — 45 000» должен перебивать «остальное —
// 120 000», а не наоборот, в каком порядке бы строки ни лежали.
export function pickTariff(
  tariffs: Tariff[],
  method: DeliveryMethod,
  city?: string | null,
): Tariff | null {
  const usable = tariffs.filter((t) => t.isActive !== false && t.method === method);
  const exact = usable.find((t) => !isDefaultCity(t.city) && sameCity(t.city, city));
  if (exact) return exact;
  return usable.find((t) => isDefaultCity(t.city)) ?? null;
}

// Стоимость доставки по тарифу.
//
// null означает «неизвестно»: у продавца нет подходящего тарифа, и стоимость он
// назначит при оформлении отправки. Это сохраняет прежнее поведение и не
// мешает оформить заказ — ноль здесь был бы обещанием бесплатной доставки.
export function deliveryCostByTariff(
  tariffs: Tariff[],
  params: { method: DeliveryMethod; city?: string | null; orderSubtotal: number },
): number | null {
  // Самовывоз бесплатен всегда: тариф для него заводить незачем.
  if (params.method === DeliveryMethod.PICKUP) return 0;

  const t = pickTariff(tariffs, params.method, params.city);
  if (!t) return null;

  // Порог сравнивается с суммой всего заказа, а не долей этого продавца — так
  // решено владельцем. При заказе от нескольких поставщиков порог может быть
  // достигнут суммой, к которой каждый добавил меньше половины.
  const free = t.freeFrom;
  if (free != null && Number(params.orderSubtotal) >= Number(free)) return 0;

  return Math.max(0, Number(t.cost) || 0);
}
