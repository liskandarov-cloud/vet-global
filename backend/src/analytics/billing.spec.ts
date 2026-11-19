import { sellerBilling } from './billing';

describe('выплаты продавцам', () => {
  it('товары − доля комиссии заказа + своя доставка', () => {
    const rows = sellerBilling(
      [
        { sellerId: 's1', orderId: 'o1', price: 1000, quantity: 2, orderCommission: 300 },
        { sellerId: 's2', orderId: 'o1', price: 500, quantity: 2, orderCommission: 300 },
      ],
      [{ deliveryQuote: { s1: 45000 }, shipments: [] }],
    );
    // Комиссия заказа 300 делится по выручке 2000 : 1000.
    expect(rows.get('s1')).toEqual({ orders: 1, revenue: 2000, commission: 200, delivery: 45000, payout: 46800 });
    expect(rows.get('s2')).toEqual({ orders: 1, revenue: 1000, commission: 100, delivery: 0, payout: 900 });
  });

  it('доставка без продавца никому не выплачивается', () => {
    const rows = sellerBilling(
      [{ sellerId: 's1', orderId: 'o1', price: 100, quantity: 1, orderCommission: 10 }],
      [{ deliveryQuote: null, shipments: [{ sellerId: null, cost: 20000 }] }],
    );
    expect(rows.get('s1')?.delivery).toBe(0);
    expect(rows.has('')).toBe(false);
  });

  it('без позиций — пусто', () => {
    expect(sellerBilling([], []).size).toBe(0);
  });
});
