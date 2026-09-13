// Можно ли оплатить заказ.
//
// Правило нужно трём независимым входам: кнопке оплаты в кабинете, протоколу
// Payme (провайдер сам спрашивает нас через CheckPerformTransaction) и протоколу
// Click. Проверки стояли только на первом, а провайдеры попадают в систему
// минуя его — поэтому через Payme можно было оплатить отменённый заказ, а после
// успешной оплаты создать и провести вторую транзакцию на тот же заказ, то есть
// списать с покупателя дважды.
//
// Оплата после доставки не запрещена намеренно: при отсрочке покупатель платит
// уже полученный товар, и статус DELIVERED — нормальное состояние для оплаты.

import { ApprovalStatus, OrderStatus, PaymentStatus } from '@prisma/client';

export type NotPayableCode =
  | 'CANCELLED'
  | 'ALREADY_PAID'
  | 'AWAITING_APPROVAL'
  | 'AWAITING_CONFIRMATION';

export interface NotPayable {
  code: NotPayableCode;
  message: string;
}

export interface PayableOrder {
  status: OrderStatus;
  approvalStatus: ApprovalStatus;
  requiresConfirmation: boolean;
  // Платежи заказа. Достаточно статусов: важно лишь, есть ли среди них успешный.
  payments?: { status: PaymentStatus }[];
}

// null — заказ оплачивать можно.
export function notPayableReason(order: PayableOrder): NotPayable | null {
  if (order.status === OrderStatus.CANCELLED) {
    return { code: 'CANCELLED', message: 'Заказ отменён — оплата невозможна' };
  }
  if ((order.payments ?? []).some((p) => p.status === PaymentStatus.PAID)) {
    return { code: 'ALREADY_PAID', message: 'Заказ уже оплачен' };
  }
  if (order.approvalStatus === ApprovalStatus.PENDING) {
    return { code: 'AWAITING_APPROVAL', message: 'Заказ ожидает согласования в организации' };
  }
  // «Под заказ»: продавец ещё не подтвердил наличие. Подтверждение — это перевод
  // заказа из статуса «Новый», поэтому проверяется вместе со статусом.
  if (order.requiresConfirmation && order.status === OrderStatus.PENDING) {
    return {
      code: 'AWAITING_CONFIRMATION',
      message: 'Заказ содержит позицию «под заказ» — оплата будет доступна после подтверждения продавцом',
    };
  }
  return null;
}
