import { ApprovalStatus, OrderStatus, PaymentStatus, UserRole } from '@prisma/client';
import { notPayableReason, onlinePaymentMode, payerError, payProviders, statusAfterPayment, type PayableOrder } from './payable';

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

describe('статус заказа после оплаты', () => {
  it('новый заказ оплата подтверждает', () => {
    expect(statusAfterPayment(OrderStatus.PENDING)).toBe(OrderStatus.CONFIRMED);
  });

  // Отсрочка: товар уже отгружен или получен, деньги приходят потом. Перевод в
  // CONFIRMED откатывал такой заказ назад по потоку.
  it('заказ дальше по потоку оплата назад не откатывает', () => {
    for (const s of [OrderStatus.CONFIRMED, OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.DELIVERED]) {
      expect(statusAfterPayment(s)).toBe(s);
    }
  });

  // Провайдер может провести транзакцию, начатую до отмены: отменённый заказ от
  // этого не оживает.
  it('отменённый заказ оплата не воскрешает', () => {
    expect(statusAfterPayment(OrderStatus.CANCELLED)).toBe(OrderStatus.CANCELLED);
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

describe('режим онлайн-оплаты', () => {
  it('live — настоящая оплата при любых данных', () => {
    expect(onlinePaymentMode('live', 'false')).toBe('live');
    expect(onlinePaymentMode('LIVE', 'true')).toBe('live');
  });

  it('имитация — только рядом с демо-данными', () => {
    expect(onlinePaymentMode('mock', 'true')).toBe('mock');
    expect(onlinePaymentMode(undefined, 'true')).toBe('mock');
  });

  // Прод: SEED_DEMO=false — только настоящая оплата, имитации нет.
  it('без демо-данных имитации нет', () => {
    expect(onlinePaymentMode('mock', 'false')).toBe('live');
    expect(onlinePaymentMode('mock', undefined)).toBe('live');
    expect(onlinePaymentMode(undefined, undefined)).toBe('live');
  });
});

describe('способы оплаты', () => {
  const env = (vars: Record<string, string>) => (k: string) => vars[k];

  it('без ключей на проде оплатить нечем', () => {
    expect(payProviders('live', env({}))).toEqual([]);
  });

  // Без секрета Click подпись не проверить, без ключа Payme — его запросы.
  it('способ появляется, только когда заданы все его ключи', () => {
    expect(payProviders('live', env({ CLICK_SERVICE_ID: '1', CLICK_MERCHANT_ID: '2' }))).toEqual([]);
    expect(payProviders('live', env({ CLICK_SERVICE_ID: '1', CLICK_MERCHANT_ID: '2', CLICK_SECRET_KEY: 's' }))).toEqual(['CLICK']);
    expect(payProviders('live', env({ PAYME_MERCHANT_ID: 'm', PAYME_KEY: 'k' }))).toEqual(['PAYME']);
  });

  it('UZUM в live не включается — мерчант-API не реализован', () => {
    expect(payProviders('live', env({ UZUM_MERCHANT_ID: 'u' }))).not.toContain('UZUM');
  });

  it('на демо-стенде доступны все', () => {
    expect(payProviders('mock', env({}))).toEqual(['CLICK', 'PAYME', 'UZUM']);
  });
});
