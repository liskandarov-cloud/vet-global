import { deliveryTotalForOrder, parseQuote } from './order-delivery';

const S1 = 'seller-1';
const S2 = 'seller-2';

describe('доставка в сумме заказа', () => {
  it('без расчёта (старые заказы) берёт стоимость отправок', () => {
    expect(deliveryTotalForOrder(null, [{ sellerId: S1, cost: 40000 }])).toBe(40000);
    expect(deliveryTotalForOrder(undefined, [{ sellerId: S1, cost: 40000 }, { sellerId: S2, cost: 10000 }])).toBe(50000);
  });

  it('посчитанное при оформлении не удваивается отправкой того же продавца', () => {
    // Продавец заводит отправку с той же стоимостью — платить дважды не за что.
    expect(deliveryTotalForOrder({ [S1]: 45000 }, [{ sellerId: S1, cost: 45000 }])).toBe(45000);
    // И даже если он вписал другую цифру: покупателю обещали ту, что в расчёте.
    expect(deliveryTotalForOrder({ [S1]: 45000 }, [{ sellerId: S1, cost: 99000 }])).toBe(45000);
  });

  it('продавец без тарифа прибавляет стоимость своей отправки', () => {
    expect(
      deliveryTotalForOrder({ [S1]: 45000 }, [
        { sellerId: S1, cost: 45000 },
        { sellerId: S2, cost: 30000 },
      ]),
    ).toBe(75000);
  });

  it('расчёт учитывается и до того, как продавец оформил отправку', () => {
    expect(deliveryTotalForOrder({ [S1]: 45000, [S2]: 30000 }, [])).toBe(75000);
  });

  it('бесплатная доставка по расчёту остаётся нулём, а не берётся из отправки', () => {
    expect(deliveryTotalForOrder({ [S1]: 0 }, [{ sellerId: S1, cost: 45000 }])).toBe(0);
  });

  it('отправка без продавца (наследие) учитывается — иначе доставка потерялась бы', () => {
    expect(deliveryTotalForOrder({ [S1]: 45000 }, [{ sellerId: null, cost: 10000 }])).toBe(55000);
  });

  it('мусор в расчёте не уменьшает сумму', () => {
    expect(parseQuote('строка')).toBeNull();
    expect(parseQuote([1, 2])).toBeNull();
    expect(parseQuote({ [S1]: -500, [S2]: 'нет' })).toEqual({});
    expect(deliveryTotalForOrder({ [S1]: -500 }, [])).toBe(0);
  });

  it('складывает копейки без накопления погрешности', () => {
    expect(deliveryTotalForOrder({ [S1]: 0.1, [S2]: 0.2 }, [])).toBe(0.3);
  });
});
