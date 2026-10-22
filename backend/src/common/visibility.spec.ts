import { canSell, PUBLIC_OFFER, PUBLIC_PRODUCT, SELLABLE_SELLER } from './visibility';

describe('canSell', () => {
  it('продаёт только проверенный и не заблокированный', () => {
    expect(canSell({ isVerified: true, isBanned: false })).toBe(true);
    expect(canSell({ isVerified: false, isBanned: false })).toBe(false);
    expect(canSell({ isVerified: true, isBanned: true })).toBe(false);
    expect(canSell(null)).toBe(false);
    expect(canSell(undefined)).toBe(false);
  });

  // Фильтр для запросов и проверка для одной записи — одно и то же правило.
  // Разойдись они, витрина показывала бы товар, который заказ отклонит.
  it('совпадает с фильтром для запросов', () => {
    expect(canSell(SELLABLE_SELLER)).toBe(true);
    expect(PUBLIC_PRODUCT.seller).toBe(SELLABLE_SELLER);
    expect(PUBLIC_OFFER.seller).toBe(SELLABLE_SELLER);
  });
});
