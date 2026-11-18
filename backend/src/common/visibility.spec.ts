import { serializeOffer } from './pricing';
import { canSell, isExpired, isShortDated, publicOffer, PUBLIC_PRODUCT, SELLABLE_SELLER } from './visibility';

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
    expect(publicOffer().seller).toBe(SELLABLE_SELLER);
  });
});

describe('срок годности', () => {
  const now = new Date('2026-11-18T12:00:00Z');
  const day = 86_400_000;
  const at = (ms: number) => new Date(now.getTime() + ms);

  it('publicOffer пропускает только партии без срока или со сроком позже «сейчас»', () => {
    const w = publicOffer(now);
    expect(w.isActive).toBe(true);
    expect(w.OR).toEqual([{ expiryDate: null }, { expiryDate: { gt: now } }]);
  });

  it('isExpired: срок, наступивший ровно сейчас, уже истёк', () => {
    expect(isExpired(null, now)).toBe(false);
    expect(isExpired(undefined, now)).toBe(false);
    expect(isExpired(at(-day), now)).toBe(true);
    expect(isExpired(now, now)).toBe(true);
    expect(isExpired(at(1000), now)).toBe(false);
    expect(isExpired(at(-day).toISOString(), now)).toBe(true);
    expect(isExpired('не дата', now)).toBe(false);
  });

  // Фильтр для запросов и проверка одной записи — одна граница.
  it('isExpired согласован с publicOffer', () => {
    const gt = (publicOffer(now).OR[1] as { expiryDate: { gt: Date } }).expiryDate.gt;
    for (const d of [at(-1), now, at(1)]) expect(isExpired(d, now)).toBe(!(d > gt));
  });

  it('isShortDated: годен, но меньше чем через N дней', () => {
    expect(isShortDated(null, now, 90)).toBe(false);
    expect(isShortDated(at(-day), now, 90)).toBe(false); // истёкший — не «короткий», а снят
    expect(isShortDated(at(10 * day), now, 90)).toBe(true);
    expect(isShortDated(at(89 * day), now, 90)).toBe(true);
    expect(isShortDated(at(90 * day), now, 90)).toBe(false);
    expect(isShortDated(at(400 * day), now, 90)).toBe(false);
  });

  it('serializeOffer отдаёт флаги expired и shortDated', () => {
    const base = { price: 100, priceUnitQty: 1, packSize: 1 };
    expect(serializeOffer({ ...base, expiryDate: new Date(Date.now() - day) })).toMatchObject({ expired: true, shortDated: false });
    expect(serializeOffer({ ...base, expiryDate: new Date(Date.now() + 10 * day) })).toMatchObject({ expired: false, shortDated: true });
    expect(serializeOffer({ ...base, expiryDate: null })).toMatchObject({ expired: false, shortDated: false });
  });
});
