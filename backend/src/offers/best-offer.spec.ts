import { pickBestOffer } from './best-offer';

const offer = (id: string, price: number, inStock: boolean, packSize = 1, priceUnitQty = 1) => ({
  id,
  price,
  inStock,
  packSize,
  priceUnitQty,
});

describe('pickBestOffer', () => {
  it('в наличии дороже, чем под заказ дешевле — берётся в наличии', () => {
    expect(pickBestOffer([offer('cheap-preorder', 100, false), offer('in-stock', 150, true)])?.id).toBe('in-stock');
  });

  it('среди одинаковых по наличию — дешевле с учётом фасовки', () => {
    // 1000 сум за 1000 доз, флакон на 5000 доз = 5000; против 3000 за флакон.
    const a = offer('per-dose', 1000, true, 5000, 1000);
    const b = offer('per-vial', 3000, true);
    expect(pickBestOffer([a, b])?.id).toBe('per-vial');
  });

  // Ровно тот случай, когда заказ раньше уходил в цену карточки без проверки наличия.
  it('нет в наличии ни у кого — дешевле из «под заказ», а не пусто', () => {
    expect(pickBestOffer([offer('b', 200, false), offer('a', 150, false)])?.id).toBe('a');
  });

  it('предложений нет — пусто', () => {
    expect(pickBestOffer([])).toBeNull();
  });
});
