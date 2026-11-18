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

import { ApprovalStatus, OrderStatus, PaymentStatus, UserRole } from '@prisma/client';

// Кто вправе создавать платёж по заказу и подтверждать его: покупатель этого
// заказа или администратор. Раньше проверялась только роль BUYER, и продавец
// проходил проверку для любого заказа — в демо-режиме оплаты он мог «оплатить»
// заказ нескольких поставщиков, после чего другой продавец отгружал товар без
// денег. null — можно.
export function payerError(
  order: { buyerId?: string | null },
  user: { id: string; role: string },
): string | null {
  if (user.role === UserRole.ADMIN) return null;
  if (order.buyerId && order.buyerId === user.id) return null;
  return 'Not authorized';
}

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

// Статус заказа после успешной оплаты.
//
// Оплата подтверждает новый заказ — и только его. Остальные статусы уже дальше
// по потоку: заказ по отсрочке платится отгруженным или доставленным, и перевод
// в CONFIRMED откатывал бы его назад (доставленный снова «Подтверждён»).
export function statusAfterPayment(current: OrderStatus): OrderStatus {
  return current === OrderStatus.PENDING ? OrderStatus.CONFIRMED : current;
}

// null — заказ оплачивать можно.
// Режим онлайн-оплаты.
//
// Имитация (mock) проводила оплату без денег и стояла на проде: любой
// покупатель нажимал «Оплатить» и получал оплаченный заказ. Теперь она
// включается только там, где и данные вымышленные (SEED_DEMO=true: локальный
// и демо-стенд, CI). Без live и без демо-данных онлайн-оплата выключена.
export type OnlinePaymentMode = 'live' | 'mock' | 'off';

export function onlinePaymentMode(paymentsMode?: string, seedDemo?: string): OnlinePaymentMode {
  if ((paymentsMode ?? '').toLowerCase() === 'live') return 'live';
  return seedDemo === 'true' ? 'mock' : 'off';
}

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
