import { splitInvoices, type SplitItem } from './invoice-split';

const S1 = 'aaa-seller-1';
const S2 = 'bbb-seller-2';

const item = (sellerId: string, price: number, quantity = 1, productName = 'Товар'): SplitItem => ({
  sellerId,
  productName,
  quantity,
  price,
});

describe('разбиение заказа на счета по продавцам', () => {
  it('один продавец — один счёт на весь заказ', () => {
    const [inv] = splitInvoices([item(S1, 100000, 2)], { [S1]: 45000 }, 0);
    expect(inv.sellerId).toBe(S1);
    expect(inv.goods).toBe(200000);
    expect(inv.delivery).toBe(45000);
    expect(inv.total).toBe(245000);
  });

  it('каждый продавец получает свои позиции и свою доставку', () => {
    const invoices = splitInvoices(
      [item(S1, 100000), item(S2, 50000, 2)],
      { [S1]: 45000, [S2]: 30000 },
      0,
    );
    expect(invoices).toHaveLength(2);
    const [a, b] = invoices;
    expect(a.goods).toBe(100000);
    expect(a.delivery).toBe(45000);
    expect(b.goods).toBe(100000);
    expect(b.delivery).toBe(30000);
  });

  // Главное свойство: счета складываются обратно в сумму заказа.
  it('сумма счетов равна сумме заказа', () => {
    const items = [item(S1, 100000), item(S2, 50000, 3)];
    const delivery = { [S1]: 45000, [S2]: 30000 };
    const points = 7000;
    const invoices = splitInvoices(items, delivery, points);
    const orderTotal = 100000 + 150000 + 45000 + 30000 - points;
    expect(invoices.reduce((s, i) => s + i.total, 0)).toBeCloseTo(orderTotal, 2);
  });

  it('баллы делятся пропорционально стоимости товаров', () => {
    const invoices = splitInvoices([item(S1, 300000), item(S2, 100000)], {}, 4000);
    expect(invoices[0].vetPointsUsed).toBe(3000);
    expect(invoices[1].vetPointsUsed).toBe(1000);
  });

  it('копейки от деления баллов не теряются — остаток уходит последнему', () => {
    const invoices = splitInvoices([item(S1, 100000), item(S2, 100000), item(S2, 100000)], {}, 1000);
    const assigned = invoices.reduce((s, i) => s + i.vetPointsUsed, 0);
    expect(assigned).toBeCloseTo(1000, 2);
  });

  it('баллы не уводят счёт в минус', () => {
    // Баллов больше, чем стоят товары одного из продавцов.
    const invoices = splitInvoices([item(S1, 1000), item(S2, 999000)], {}, 500000);
    expect(invoices[0].total).toBeGreaterThanOrEqual(0);
    expect(invoices[0].vetPointsUsed).toBeLessThanOrEqual(invoices[0].goods);
  });

  it('продавец только с доставкой тоже получает счёт', () => {
    const invoices = splitInvoices([item(S1, 100000)], { [S1]: 45000, [S2]: 30000 }, 0);
    expect(invoices).toHaveLength(2);
    const only = invoices.find((i) => i.sellerId === S2)!;
    expect(only.items).toHaveLength(0);
    expect(only.total).toBe(30000);
  });

  it('доставка без продавца в счета не попадает: выставить её некому', () => {
    const invoices = splitInvoices([item(S1, 100000)], { '': 10000 }, 0);
    expect(invoices).toHaveLength(1);
    expect(invoices[0].delivery).toBe(0);
  });

  it('пустой заказ даёт пустой список, а не счёт на ноль', () => {
    expect(splitInvoices([], {}, 0)).toEqual([]);
  });
});
