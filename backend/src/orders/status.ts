// Допустимые переходы статуса заказа.
//
// Раньше updateStatus принимал любой статус из любого: заказ мог прыгнуть из
// PENDING прямо в DELIVERED, минуя оплату. А на доставке начисляются VetPoints
// и заказ попадает в выручку — то есть неоплаченный заказ выглядел бы
// завершённым и принёс бы покупателю баллы.

import { OrderStatus } from '@prisma/client';

// Поток линейный, отмена — выход с любого шага до получения.
//
// Отмену после отправки оставляем: покупатель отказывается при доставке, и это
// происходит в жизни. А DELIVERED и CANCELLED — конечные: исправлять их задним
// числом это работа администратора, а не обычный переход.
const ALLOWED: Record<OrderStatus, readonly OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
};

export function allowedTransitions(from: OrderStatus): readonly OrderStatus[] {
  return ALLOWED[from] ?? [];
}

export function isTransitionAllowed(from: OrderStatus, to: OrderStatus): boolean {
  // Повторная установка того же статуса безвредна: клиент мог отправить запрос
  // дважды, и падать на этом незачем.
  if (from === to) return true;
  return allowedTransitions(from).includes(to);
}

// Текст ошибки для ответа: перечисляем, что из текущего статуса возможно, —
// иначе продавец видит отказ и не понимает, что делать дальше.
export function transitionError(from: OrderStatus, to: OrderStatus): string {
  const next = allowedTransitions(from);
  if (!next.length) {
    return `Заказ в статусе ${from} — конечном, сменить на ${to} нельзя`;
  }
  return `Из статуса ${from} нельзя перейти в ${to}. Допустимо: ${next.join(', ')}`;
}
