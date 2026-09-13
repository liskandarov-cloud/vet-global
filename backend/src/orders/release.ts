// Что вернуть покупателю и складу при отмене заказа.
//
// Создание заказа забирает три вещи: остаток товара, кредитный лимит и баллы.
// Отмена обязана вернуть каждую — иначе лимит и баллы покупателя сгорают, а
// склад продавца расходится с действительностью. Решения вынесены в чистые
// функции: ошибка здесь означает чужие деньги и неверный остаток.
//
// Каждая функция проверяет собственную отметку о возврате и возвращает «ничего»,
// если возврат уже был. Повторная отмена, второй колбэк провайдера или
// одновременный запрос не должны вернуть одно и то же дважды.

import { PaymentTerm } from '@prisma/client';

export interface ReleasableOrder {
  buyerId?: string | null;
  paymentTerm: PaymentTerm;
  total: number;
  vetPointsUsed: number;
  creditReleasedAt?: Date | null;
  stockReturnedAt?: Date | null;
  pointsRefundedAt?: Date | null;
}

export interface ReleasableItem {
  productId?: string | null;
  quantity: number;
  stockTaken: boolean;
}

// Кредитный лимит резервируется под отсрочку и рассрочку на всю сумму заказа.
// При предоплате резерва нет, освобождать нечего. Гостевой заказ лимита не
// занимает: лимит есть только у зарегистрированного покупателя.
export function creditToRelease(order: ReleasableOrder): number {
  if (order.creditReleasedAt) return 0;
  if (!order.buyerId) return 0;
  if (order.paymentTerm === PaymentTerm.PREPAY) return 0;
  return positive(order.total);
}

// Баллы возвращаются тому, кто ими заплатил. У гостя баллов нет.
export function pointsToRefund(order: ReleasableOrder): number {
  if (order.pointsRefundedAt) return 0;
  if (!order.buyerId) return 0;
  return positive(order.vetPointsUsed);
}

// На склад возвращается только то, что со склада действительно ушло: позиции с
// отметкой о списании. Позиции «под заказ» остаток не трогали, и возврат по ним
// завысил бы склад — товар, которого нет, снова показался бы в наличии.
export function stockToReturn(
  order: ReleasableOrder,
  items: ReleasableItem[],
): { productId: string; quantity: number }[] {
  if (order.stockReturnedAt) return [];
  const byProduct = new Map<string, number>();
  for (const it of items) {
    if (!it.stockTaken || !it.productId) continue;
    const qty = positive(it.quantity);
    if (!qty) continue;
    byProduct.set(it.productId, (byProduct.get(it.productId) ?? 0) + qty);
  }
  return [...byProduct].map(([productId, quantity]) => ({ productId, quantity }));
}

function positive(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}
