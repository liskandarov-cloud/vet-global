import { describe, it, expect } from 'vitest';
import { estimateParams, isComplete, totalWithDelivery, type DeliveryEstimate } from './delivery';

const est = (over: Partial<DeliveryEstimate> = {}): DeliveryEstimate => ({
  total: 45000,
  method: 'COURIER',
  city: 'Ташкент',
  bySeller: [{ sellerId: 's1', cost: 45000 }],
  unknown: [],
  ...over,
});

describe('параметры запроса оценки', () => {
  it('позиция с оффером уходит как оффер, без оффера — как товар', () => {
    const p = estimateParams([{ productId: 'p1', offerId: 'o1' }, { productId: 'p2' }], 'COURIER', 'Ташкент', 100);
    expect(p.offerIds).toBe('o1');
    expect(p.productIds).toBe('p2');
    expect(p.city).toBe('Ташкент');
    expect(p.subtotal).toBe('100');
  });

  it('не отправляет пустой город — иначе он выглядел бы как выбранный', () => {
    expect(estimateParams([{ productId: 'p1' }], 'COURIER', '   ', 100).city).toBeUndefined();
  });

  it('обрезает пробелы в городе: « Ташкент » — тот же город', () => {
    expect(estimateParams([{ productId: 'p1' }], 'COURIER', ' Ташкент ', 100).city).toBe('Ташкент');
  });

  it('не дублирует один товар, добавленный дважды', () => {
    const p = estimateParams([{ productId: 'p1' }, { productId: 'p1' }], 'PICKUP', '', 100);
    expect(p.productIds).toBe('p1');
  });

  it('не отправляет пустые списки', () => {
    const p = estimateParams([{ productId: 'p1', offerId: 'o1' }], 'COURIER', '', 100);
    expect(p.productIds).toBeUndefined();
    expect(p.offerIds).toBe('o1');
  });
});

describe('итог с доставкой', () => {
  it('баллы списываются с товара, доставка прибавляется сверху', () => {
    expect(totalWithDelivery(100000, 10000, 45000)).toBe(135000);
  });

  it('баллы не уводят сумму товара в минус', () => {
    expect(totalWithDelivery(1000, 5000, 45000)).toBe(45000);
  });

  it('без доставки считает как раньше', () => {
    expect(totalWithDelivery(100000, 10000, 0)).toBe(90000);
  });

  it('не накапливает погрешность на копейках', () => {
    expect(totalWithDelivery(0.1, 0, 0.2)).toBe(0.3);
  });
});

describe('полнота расчёта', () => {
  it('расчёт без продавцов без тарифа считается полным', () => {
    expect(isComplete(est())).toBe(true);
  });

  it('продавец без тарифа делает расчёт неполным', () => {
    expect(isComplete(est({ unknown: ['s2'] }))).toBe(false);
  });

  it('отсутствие расчёта — не полный расчёт', () => {
    expect(isComplete(null)).toBe(false);
  });
});
