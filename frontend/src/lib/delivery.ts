// Расчёт доставки для корзины: что спросить у сервера и как показать итог.
//
// Считает сервер — по тарифам продавцов, и он же посчитает её при оформлении.
// Здесь только подготовка запроса и арифметика итога, чтобы цифра в корзине
// совпадала с суммой созданного заказа.

export type DeliveryMethod = 'COURIER' | 'PICKUP';

export interface DeliveryEstimate {
  total: number;
  method: DeliveryMethod;
  city: string | null;
  bySeller: { sellerId: string; cost: number }[];
  // Продавцы без подходящего тарифа: их доставку посчитают при отправке.
  unknown: string[];
}

// Параметры запроса оценки.
//
// Позиция с выбранным оффером уходит как оффер, остальные — как товар: продавца
// сервер определяет так же, как при сборке заказа, иначе доставку посчитали бы
// не тому продавцу.
export function estimateParams(
  items: { productId: string; offerId?: string }[],
  method: DeliveryMethod,
  city: string,
  subtotal: number,
): Record<string, string> {
  const offerIds = items.map((i) => i.offerId).filter(Boolean) as string[];
  const productIds = items.filter((i) => !i.offerId).map((i) => i.productId);
  const params: Record<string, string> = { method, subtotal: String(subtotal) };
  if (offerIds.length) params.offerIds = unique(offerIds).join(',');
  if (productIds.length) params.productIds = unique(productIds).join(',');
  const trimmed = city.trim();
  if (trimmed) params.city = trimmed;
  return params;
}

// Сумма к оплате. Порядок тот же, что на сервере: доставка прибавляется после
// списания баллов, потому что баллами платят за товар, а не за доставку.
export function totalWithDelivery(subtotal: number, pointsUsed: number, delivery: number): number {
  return round2(Math.max(0, subtotal - pointsUsed) + Math.max(0, delivery));
}

// Доставку показываем только когда она известна целиком. Если у части
// продавцов тарифа нет, сумма заведомо неполная, и выдавать её за итог нельзя:
// покупатель решил бы, что заплатит меньше.
export function isComplete(estimate: DeliveryEstimate | null): boolean {
  return !!estimate && estimate.unknown.length === 0;
}

function unique(xs: string[]): string[] {
  return [...new Set(xs)];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
