// Части заказа нескольких поставщиков.
//
// Раньше у такого заказа был один статус на всех, и любой его продавец менял
// его целиком: отменял часть конкурента или ставил «Доставлен», хотя второй
// поставщик ещё ничего не отгрузил. Теперь продавец ведёт свою часть, а статус
// заказа складывается из частей.

import { OrderStatus } from '@prisma/client';
import { orderTotal, percentOf, round2 } from '../common/pricing';

const RANK: Record<OrderStatus, number> = {
  [OrderStatus.PENDING]: 0,
  [OrderStatus.CONFIRMED]: 1,
  [OrderStatus.PROCESSING]: 2,
  [OrderStatus.SHIPPED]: 3,
  [OrderStatus.DELIVERED]: 4,
  [OrderStatus.CANCELLED]: 5,
};

// Статус заказа — по самой отстающей из неотменённых частей; все отменены —
// заказ отменён. Так «Доставлен» наступает, только когда доставили все.
export function aggregateStatus(parts: OrderStatus[]): OrderStatus {
  const live = parts.filter((s) => s !== OrderStatus.CANCELLED);
  if (!live.length) return OrderStatus.CANCELLED;
  return live.reduce((min, s) => (RANK[s] < RANK[min] ? s : min));
}

// Суммы заказа после того, как одна часть из него убрана.
//
// Считается тем же правилом, что при оформлении: комиссия и баллы — от суммы
// товаров, итог — товары минус баллы плюс доставка. Баллов не может быть больше
// суммы товаров: излишек возвращается покупателю (pointsBack).
export function totalsWithoutPart(
  order: { subtotal: number; vetPointsUsed: number; total: number },
  partGoods: number,
  deliveryCost: number,
  pct: { commission: number; earn: number },
) {
  const subtotal = round2(Math.max(0, Number(order.subtotal) - partGoods));
  const usedBefore = Number(order.vetPointsUsed) || 0;
  const vetPointsUsed = Math.min(usedBefore, subtotal);
  const total = orderTotal(subtotal, vetPointsUsed, deliveryCost);
  return {
    subtotal,
    deliveryCost: round2(deliveryCost),
    vetPointsUsed,
    total,
    commission: percentOf(subtotal, pct.commission),
    vetPointsEarned: percentOf(subtotal, pct.earn),
    // На сколько уменьшилась сумма к оплате и сколько баллов вернуть.
    reduction: round2(Number(order.total) - total),
    pointsBack: round2(usedBefore - vetPointsUsed),
  };
}
