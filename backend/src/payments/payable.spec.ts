import { ApprovalStatus, OrderStatus, PaymentStatus } from '@prisma/client';
import { notPayableReason, type PayableOrder } from './payable';

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
