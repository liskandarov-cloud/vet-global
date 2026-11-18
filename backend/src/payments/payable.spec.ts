import { ApprovalStatus, OrderStatus, PaymentStatus, UserRole } from '@prisma/client';
import { notPayableReason, payerError, type PayableOrder } from './payable';

const order = (over: Partial<PayableOrder> = {}): PayableOrder => ({
  status: OrderStatus.CONFIRMED,
  approvalStatus: ApprovalStatus.NONE,
  requiresConfirmation: false,
  payments: [],
  ...over,
});

describe('можно ли оплатить заказ', () => {
  it('обычный заказ оплачивать можно', () => {
    expect(notPayableReason(order())).toBeNull();
    expect(notPayableReason(order({ status: OrderStatus.PENDING }))).toBeNull();
  });

  it('отменённый заказ оплатить нельзя', () => {
    expect(notPayableReason(order({ status: OrderStatus.CANCELLED }))?.code).toBe('CANCELLED');
  });

  it('оплаченный заказ второй раз оплатить нельзя', () => {
    expect(notPayableReason(order({ payments: [{ status: PaymentStatus.PAID }] }))?.code).toBe('ALREADY_PAID');
  });

  it('неудачные и отменённые платежи повторной оплате не мешают', () => {
    expect(
      notPayableReason(
        order({ payments: [{ status: PaymentStatus.CANCELLED }, { status: PaymentStatus.PENDING }] }),
      ),
    ).toBeNull();
  });

  it('возвращённый платёж оплате не мешает: деньги покупателю вернули', () => {
    expect(notPayableReason(order({ payments: [{ status: PaymentStatus.REFUNDED }] }))).toBeNull();
  });

  it('заказ на согласовании оплатить нельзя', () => {
    expect(notPayableReason(order({ approvalStatus: ApprovalStatus.PENDING }))?.code).toBe('AWAITING_APPROVAL');
  });

  it('позиция «под заказ» блокирует оплату до подтверждения продавцом', () => {
    expect(
      notPayableReason(order({ requiresConfirmation: true, status: OrderStatus.PENDING }))?.code,
    ).toBe('AWAITING_CONFIRMATION');
    // Продавец подтвердил — перевёл из «Нового», и оплата открылась.
    expect(notPayableReason(order({ requiresConfirmation: true, status: OrderStatus.CONFIRMED }))).toBeNull();
  });

  // При отсрочке покупатель платит уже полученный товар: запрещать оплату
  // доставленного заказа значило бы запретить саму отсрочку.
  it('доставленный заказ оплатить можно — это отсрочка', () => {
    expect(notPayableReason(order({ status: OrderStatus.DELIVERED }))).toBeNull();
  });

  it('отмена важнее прочих причин: её видно первой', () => {
    const o = order({
      status: OrderStatus.CANCELLED,
      approvalStatus: ApprovalStatus.PENDING,
      payments: [{ status: PaymentStatus.PAID }],
    });
    expect(notPayableReason(o)?.code).toBe('CANCELLED');
  });
});

// Кто может создавать платёж по заказу и подтверждать его.
//
// Проверка касалась только роли BUYER: продавец (и любой не-покупатель)
// проходил её для любого заказа. На проде, где оплата в демо-режиме, продавец
// из заказа нескольких поставщиков подтверждал «оплату» целого заказа, и
// второй продавец отгружал товар, за который никто не платил.
describe('кто платит по заказу', () => {
  const order = { buyerId: 'buyer-1' };

  it('покупатель заказа может', () => {
    expect(payerError(order, { id: 'buyer-1', role: UserRole.BUYER })).toBeNull();
  });

  it('администратор может', () => {
    expect(payerError(order, { id: 'admin-1', role: UserRole.ADMIN })).toBeNull();
  });

  it('продавец — нет, даже если его позиции есть в заказе', () => {
    expect(payerError(order, { id: 'seller-1', role: UserRole.SELLER })).not.toBeNull();
  });

  it('чужой покупатель — нет', () => {
    expect(payerError(order, { id: 'buyer-2', role: UserRole.BUYER })).not.toBeNull();
  });

  it('гостевой заказ (без покупателя) из кабинета не оплачивается никем, кроме админа', () => {
    expect(payerError({ buyerId: null }, { id: 'buyer-1', role: UserRole.BUYER })).not.toBeNull();
    expect(payerError({ buyerId: null }, { id: 'admin-1', role: UserRole.ADMIN })).toBeNull();
  });
});
