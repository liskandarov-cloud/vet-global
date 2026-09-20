import { summariesBySeller, type SummaryItem } from './order-summary';

const S1 = 'aaa-seller';
const S2 = 'bbb-seller';

const item = (sellerId: string, productName: string, price: number, quantity = 1): SummaryItem => ({
  sellerId,
  productName,
  quantity,
  price,
});

describe('что продавец видит в письме о заказе', () => {
  it('продавец получает только свои позиции', () => {
    const parts = summariesBySeller([
      item(S1, 'Вакцина', 100000),
      item(S2, 'Перчатки', 20000, 3),
    ]);
    expect(parts).toHaveLength(2);

    const first = parts.find((p) => p.sellerId === S1)!;
    expect(first.items.map((i) => i.productName)).toEqual(['Вакцина']);
    // Чужого товара в перечне нет — это и была утечка конкуренту.
    expect(JSON.stringify(first)).not.toContain('Перчатки');
  });

  it('сумма в письме — по своим позициям, а не по всему заказу', () => {
    const parts = summariesBySeller([item(S1, 'Вакцина', 100000), item(S2, 'Перчатки', 20000, 3)]);
    expect(parts.find((p) => p.sellerId === S1)!.total).toBe(100000);
    expect(parts.find((p) => p.sellerId === S2)!.total).toBe(60000);
  });

  it('доставка своего продавца входит в его сумму', () => {
    const parts = summariesBySeller([item(S1, 'Вакцина', 100000)], { [S1]: 45000 });
    expect(parts[0].total).toBe(145000);
  });

  it('единственный продавец получает весь заказ', () => {
    const parts = summariesBySeller([item(S1, 'Вакцина', 100000), item(S1, 'Шприцы', 5000, 4)]);
    expect(parts).toHaveLength(1);
    expect(parts[0].items).toHaveLength(2);
    expect(parts[0].total).toBe(120000);
  });

  it('продавец без позиций письма не получает', () => {
    const parts = summariesBySeller([item(S1, 'Вакцина', 100000)], { [S1]: 45000, [S2]: 30000 });
    expect(parts.map((p) => p.sellerId)).toEqual([S1]);
  });
});
