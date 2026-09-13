import { PaymentTerm } from '@prisma/client';
import { creditToRelease, pointsToRefund, stockToReturn, type ReleasableOrder } from './release';

const order = (over: Partial<ReleasableOrder> = {}): ReleasableOrder => ({
  buyerId: 'buyer-1',
  paymentTerm: PaymentTerm.NET_TERMS,
  total: 145000,
  vetPointsUsed: 5000,
  ...over,
});

describe('возврат кредитного лимита', () => {
  it('возвращает всю сумму заказа по отсрочке и рассрочке', () => {
    expect(creditToRelease(order())).toBe(145000);
    expect(creditToRelease(order({ paymentTerm: PaymentTerm.INSTALLMENT }))).toBe(145000);
  });

  it('при предоплате резерва нет — возвращать нечего', () => {
    expect(creditToRelease(order({ paymentTerm: PaymentTerm.PREPAY }))).toBe(0);
  });

  it('у гостевого заказа лимита нет', () => {
    expect(creditToRelease(order({ buyerId: null }))).toBe(0);
  });

  it('повторный возврат ничего не освобождает', () => {
    expect(creditToRelease(order({ creditReleasedAt: new Date() }))).toBe(0);
  });
});

describe('возврат баллов', () => {
  it('возвращает списанные баллы', () => {
    expect(pointsToRefund(order())).toBe(5000);
  });

  it('без списания возвращать нечего', () => {
    expect(pointsToRefund(order({ vetPointsUsed: 0 }))).toBe(0);
  });

  it('повторный возврат баллов не начисляет их снова', () => {
    expect(pointsToRefund(order({ pointsRefundedAt: new Date() }))).toBe(0);
  });

  it('гостю баллы не возвращаются — их и не было', () => {
    expect(pointsToRefund(order({ buyerId: null, vetPointsUsed: 5000 }))).toBe(0);
  });
});

describe('возврат остатка на склад', () => {
  it('возвращает только списанные позиции', () => {
    expect(
      stockToReturn(order(), [
        { productId: 'p1', quantity: 2, stockTaken: true },
        { productId: 'p2', quantity: 5, stockTaken: false },
      ]),
    ).toEqual([{ productId: 'p1', quantity: 2 }]);
  });

  it('складывает один товар, попавший в заказ двумя позициями', () => {
    expect(
      stockToReturn(order(), [
        { productId: 'p1', quantity: 2, stockTaken: true },
        { productId: 'p1', quantity: 3, stockTaken: true },
      ]),
    ).toEqual([{ productId: 'p1', quantity: 5 }]);
  });

  it('позиция тендера без товара каталога склад не трогает', () => {
    expect(stockToReturn(order(), [{ productId: null, quantity: 2, stockTaken: true }])).toEqual([]);
  });

  it('повторная отмена не возвращает остаток второй раз', () => {
    expect(
      stockToReturn(order({ stockReturnedAt: new Date() }), [{ productId: 'p1', quantity: 2, stockTaken: true }]),
    ).toEqual([]);
  });

  it('нулевое и отрицательное количество игнорируется', () => {
    expect(
      stockToReturn(order(), [
        { productId: 'p1', quantity: 0, stockTaken: true },
        { productId: 'p2', quantity: -3, stockTaken: true },
      ]),
    ).toEqual([]);
  });
});
