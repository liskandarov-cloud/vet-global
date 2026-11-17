import { paymeReceiptDetail } from './payme-receipt';

const line = (over = {}) => ({
  productName: 'Ивермектин 1% 50 мл',
  quantity: 3,
  price: 86419.2,
  mxikCode: '03004001001000000',
  packageCode: '1500563',
  vatPayer: true,
  ...over,
});

describe('фискальный чек Payme', () => {
  it('строки в тийинах, с кодами ИКПУ и ставкой НДС продавца', () => {
    const { detail, balanced } = paymeReceiptDetail({ total: 259257.6, items: [line()] });
    expect(balanced).toBe(true);
    expect(detail.receipt_type).toBe(0);
    expect(detail.items[0]).toEqual({
      title: 'Ивермектин 1% 50 мл',
      price: 8641920,
      count: 3,
      code: '03004001001000000',
      package_code: '1500563',
      vat_percent: 12,
      discount: 0,
    });
    expect(detail.shipping).toBeUndefined();
  });

  it('неплательщик НДС пробивает 0 %, пустые коды не отправляются', () => {
    const { detail } = paymeReceiptDetail({ total: 100, items: [line({ vatPayer: false, mxikCode: null, packageCode: null, quantity: 1, price: 100 })] });
    expect(detail.items[0].vat_percent).toBe(0);
    expect(detail.items[0]).not.toHaveProperty('code');
    expect(detail.items[0]).not.toHaveProperty('package_code');
  });

  it('баллы — скидка по строкам, доставка — отдельно; сумма сходится до тийина', () => {
    // 3 строки с ценами, на которых пропорция даёт дробные тийины.
    const items = [line({ price: 33333.33, quantity: 1 }), line({ price: 33333.33, quantity: 1 }), line({ price: 33333.34, quantity: 1 })];
    const subtotal = 100000;
    const points = 10000.01;
    const delivery = 45000;
    const total = Math.round((subtotal - points + delivery) * 100) / 100;
    const { detail, balanced } = paymeReceiptDetail({ total, deliveryCost: delivery, vetPointsUsed: points, items });
    expect(balanced).toBe(true);
    expect(detail.items.reduce((s, it) => s + it.discount, 0)).toBe(1000001);
    expect(detail.shipping).toEqual({ title: 'Доставка', price: 4500000 });
  });

  it('несходящаяся сумма помечается — такой чек не отправляем', () => {
    const { balanced } = paymeReceiptDetail({ total: 1, items: [line()] });
    expect(balanced).toBe(false);
  });
});
