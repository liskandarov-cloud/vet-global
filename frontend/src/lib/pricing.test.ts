import { describe, it, expect } from 'vitest';
import { applyPromotion, effectiveUnitPrice, unitPriceForQty } from './pricing';
import type { Offer } from './types';

const offer = (over: Partial<Offer> = {}): Offer =>
  ({ id: 'o1', productId: 'p1', sellerId: 's1', price: 100000, minOrder: 1, inStock: true, isActive: true, ...over }) as Offer;

describe('цена единицы заказа', () => {
  it('берёт цену фасовки, когда она есть', () => {
    expect(unitPriceForQty(offer({ packPrice: 112000 }), 1)).toBe(112000);
  });

  it('объёмная скидка применяется от нужного количества', () => {
    const o = offer({ priceBreaks: [{ minQty: 10, price: 90000 }, { minQty: 50, price: 80000 }] as any });
    expect(unitPriceForQty(o, 1)).toBe(100000);
    expect(unitPriceForQty(o, 10)).toBe(90000);
    expect(unitPriceForQty(o, 60)).toBe(80000);
  });
});

describe('акция на витрине', () => {
  it('снимает процент', () => {
    expect(applyPromotion(100000, 25)).toBe(75000);
  });

  it('отсутствие, ноль и отрицательный процент цену не меняют', () => {
    expect(applyPromotion(100000, undefined)).toBe(100000);
    expect(applyPromotion(100000, 0)).toBe(100000);
    expect(applyPromotion(100000, -10)).toBe(100000);
  });

  it('больше ста процентов обрезается до ста', () => {
    expect(applyPromotion(100000, 150)).toBe(0);
  });

  it('применяется к цене с объёмной скидкой, а не к базовой', () => {
    const o = offer({ priceBreaks: [{ minQty: 10, price: 90000 }] as any, promoPercent: 10 });
    expect(effectiveUnitPrice(o, 10)).toBe(81000);
  });
});

describe('договорная цена — потолок, а не замена расчёта', () => {
  it('договорная дешевле — платит договорную', () => {
    expect(effectiveUnitPrice(offer(), 1, 80000)).toBe(80000);
  });

  // Это и расходилось с сервером: витрина показывала договорную цену, хотя
  // объёмная скидка была выгоднее, а сервер списывал меньшую.
  it('объёмная скидка выгоднее договорной — платит по скидке', () => {
    const o = offer({ priceBreaks: [{ minQty: 10, price: 70000 }] as any });
    expect(effectiveUnitPrice(o, 10, 80000)).toBe(70000);
  });

  it('акционная дешевле договорной — платит акционную', () => {
    expect(effectiveUnitPrice(offer({ promoPercent: 20 }), 1, 95000)).toBe(80000);
  });

  it('договорная цена акцией дополнительно не уценивается', () => {
    expect(effectiveUnitPrice(offer({ promoPercent: 10 }), 1, 85000)).toBe(85000);
  });
});
