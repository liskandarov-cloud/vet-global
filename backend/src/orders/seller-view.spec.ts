import { sellerView } from './seller-view';

const order = {
  id: 'o-1',
  subtotal: 500,
  total: 520,
  commission: 60,
  vetPointsUsed: 10,
  items: [
    { id: 'i-1', sellerId: 's-1', price: 100, quantity: 2 },
    { id: 'i-2', sellerId: 's-2', price: 300, quantity: 1 },
  ],
  invoices: [
    { id: 'inv-1', sellerId: 's-1', amount: 200 },
    { id: 'inv-2', sellerId: 's-2', amount: 300 },
  ],
  shipments: [
    { id: 'sh-1', sellerId: 's-1', cost: 20 },
    { id: 'sh-2', sellerId: 's-2', cost: 0 },
  ],
  payments: [{ id: 'p-1', provider: 'PAYME', status: 'PAID', amount: 520, createdAt: 'x' }],
};

describe('заказ глазами продавца', () => {
  it('заказ нескольких продавцов: только свои позиции, счета и отправки', () => {
    const v = sellerView(order, 's-1');
    expect(v.items.map((i: any) => i.id)).toEqual(['i-1']);
    expect(v.invoices.map((i: any) => i.id)).toEqual(['inv-1']);
    expect(v.shipments.map((s: any) => s.id)).toEqual(['sh-1']);
  });

  it('суммы и комиссия — по своей части, сумма платежа скрыта', () => {
    const v = sellerView(order, 's-1');
    expect(v.subtotal).toBe(200);
    expect(v.deliveryCost).toBe(20);
    expect(v.total).toBe(220);
    expect(v.commission).toBe(24); // 60 × 200 / 500
    expect(v.vetPointsUsed).toBe(0);
    expect(v.payments[0]).toEqual({ id: 'p-1', provider: 'PAYME', status: 'PAID', createdAt: 'x' });
    expect(v.partial).toBe(true);
  });

  it('заказ одного продавца не меняется', () => {
    const single = { ...order, items: [order.items[0]] };
    expect(sellerView(single, 's-1')).toBe(single);
  });
});
