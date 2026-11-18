import { OrderStatus as S } from '@prisma/client';
import { aggregateStatus, totalsWithoutPart } from './parts';

describe('статус заказа из частей', () => {
  it('по самой отстающей части', () => {
    expect(aggregateStatus([S.SHIPPED, S.CONFIRMED])).toBe(S.CONFIRMED);
    expect(aggregateStatus([S.DELIVERED, S.SHIPPED])).toBe(S.SHIPPED);
  });

  it('«Доставлен» — только когда доставили все', () => {
    expect(aggregateStatus([S.DELIVERED, S.DELIVERED])).toBe(S.DELIVERED);
  });

  it('отменённая часть не держит заказ', () => {
    expect(aggregateStatus([S.CANCELLED, S.DELIVERED])).toBe(S.DELIVERED);
  });

  it('все части отменены — заказ отменён', () => {
    expect(aggregateStatus([S.CANCELLED, S.CANCELLED])).toBe(S.CANCELLED);
  });
});

describe('суммы заказа без отменённой части', () => {
  const pct = { commission: 12, earn: 1 };

  it('товары, комиссия, баллы и итог пересчитываются', () => {
    // 1 000 000 товаров (300 000 у отменившего), доставка 50 000 → 20 000, баллы 10 000.
    const t = totalsWithoutPart({ subtotal: 1_000_000, vetPointsUsed: 10_000, total: 1_040_000 }, 300_000, 20_000, pct);
    expect(t.subtotal).toBe(700_000);
    expect(t.total).toBe(710_000);
    expect(t.commission).toBe(84_000);
    expect(t.vetPointsEarned).toBe(7_000);
    expect(t.reduction).toBe(330_000);
    expect(t.pointsBack).toBe(0);
  });

  it('баллов не больше оставшихся товаров — излишек возвращается', () => {
    const t = totalsWithoutPart({ subtotal: 100_000, vetPointsUsed: 10_000, total: 90_000 }, 95_000, 0, pct);
    expect(t.subtotal).toBe(5_000);
    expect(t.vetPointsUsed).toBe(5_000);
    expect(t.total).toBe(0);
    expect(t.pointsBack).toBe(5_000);
  });
});
