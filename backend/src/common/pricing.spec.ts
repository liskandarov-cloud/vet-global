import {
  packPriceOf,
  unitPriceForQty,
  unitPriceWithContract,
  percentOf,
  vetPointsSpendable,
  orderTotal,
  applyPromotion,
  bestPromotionPercent,
  unitPriceFinal,
  type PromotionLike,
} from './pricing';

describe('packPriceOf — цена единицы заказа с учётом фасовки', () => {
  it('обычный товар: цена не меняется', () => {
    expect(packPriceOf({ price: 1500 })).toBe(1500);
    expect(packPriceOf({ price: 1500, packSize: 1, priceUnitQty: 1 })).toBe(1500);
  });

  it('цена за 1000 доз, флакон на 5000 доз — умножается на пять', () => {
    expect(packPriceOf({ price: 20000, priceUnitQty: 1000, packSize: 5000 })).toBe(100000);
  });

  it('флакон меньше базовой единицы — цена пропорционально ниже', () => {
    expect(packPriceOf({ price: 20000, priceUnitQty: 1000, packSize: 250 })).toBe(5000);
  });

  it('результат округляется до целого: копейки в цене упаковки не нужны', () => {
    expect(packPriceOf({ price: 100, priceUnitQty: 3, packSize: 1 })).toBe(33);
  });

  it('нулевой или отсутствующий делитель не ломает расчёт', () => {
    // priceUnitQty = 0 дало бы Infinity, поэтому в коде стоит «|| 1».
    expect(packPriceOf({ price: 500, priceUnitQty: 0, packSize: 1 })).toBe(500);
    expect(packPriceOf({ price: 500, packSize: 0 })).toBe(500);
  });

  it('пустой оффер даёт ноль, а не NaN', () => {
    expect(packPriceOf(undefined)).toBe(0);
    expect(packPriceOf({})).toBe(0);
  });
});

describe('unitPriceForQty — объёмные скидки', () => {
  const offer = {
    price: 10000,
    priceBreaks: [
      { minQty: 10, price: 9000 },
      { minQty: 50, price: 8000 },
    ],
  };

  it('ниже первого порога — базовая цена', () => {
    expect(unitPriceForQty(offer, 1)).toBe(10000);
    expect(unitPriceForQty(offer, 9)).toBe(10000);
  });

  it('на пороге скидка уже действует', () => {
    expect(unitPriceForQty(offer, 10)).toBe(9000);
    expect(unitPriceForQty(offer, 50)).toBe(8000);
  });

  it('между порогами действует предыдущий', () => {
    expect(unitPriceForQty(offer, 49)).toBe(9000);
  });

  it('выше последнего порога цена не растёт обратно', () => {
    expect(unitPriceForQty(offer, 1000)).toBe(8000);
  });

  it('порядок порогов в данных не важен — они сортируются', () => {
    const reversed = {
      price: 10000,
      priceBreaks: [
        { minQty: 50, price: 8000 },
        { minQty: 10, price: 9000 },
      ],
    };
    expect(unitPriceForQty(reversed, 60)).toBe(8000);
    expect(unitPriceForQty(reversed, 20)).toBe(9000);
  });

  it('скидка перебивает расчёт фасовки, а не складывается с ним', () => {
    const packed = { price: 20000, priceUnitQty: 1000, packSize: 5000, priceBreaks: [{ minQty: 5, price: 90000 }] };
    expect(unitPriceForQty(packed, 1)).toBe(100000);
    expect(unitPriceForQty(packed, 5)).toBe(90000);
  });

  it('без скидок ведёт себя как packPriceOf', () => {
    expect(unitPriceForQty({ price: 777 }, 100)).toBe(777);
    expect(unitPriceForQty({ price: 777, priceBreaks: null }, 100)).toBe(777);
  });
});

describe('percentOf — комиссия платформы и начисление баллов', () => {
  it('комиссия 12% от суммы заказа', () => {
    expect(percentOf(1000000, 12)).toBe(120000);
  });

  it('начисление 1% от суммы заказа', () => {
    expect(percentOf(1000000, 1)).toBe(10000);
  });

  it('округляет до копеек, а не оставляет длинный хвост', () => {
    // 1234.56 * 12% = 148.1472 — в базу должно уйти 148.15, а не 148.1472
    expect(percentOf(1234.56, 12)).toBe(148.15);
    // 999.99 * 12% = 119.9988 — ровно 120 после округления
    expect(percentOf(999.99, 12)).toBe(120);
  });

  it('ноль процентов и нулевая сумма дают ноль', () => {
    expect(percentOf(1000, 0)).toBe(0);
    expect(percentOf(0, 12)).toBe(0);
  });

  it('мусор на входе не превращается в NaN', () => {
    expect(percentOf(NaN, 12)).toBe(0);
    expect(percentOf(1000, undefined as any)).toBe(0);
  });
});

describe('vetPointsSpendable — сколько баллов можно списать', () => {
  // Порог по умолчанию: не больше 10% от суммы заказа.
  const MAX = 10;

  it('запрос в пределах лимита и баланса проходит целиком', () => {
    expect(vetPointsSpendable(100000, 5000, 50000, MAX)).toBe(5000);
  });

  it('ограничение долей от заказа: 10% от 100000 это 10000', () => {
    expect(vetPointsSpendable(100000, 99999, 500000, MAX)).toBe(10000);
  });

  it('ограничение балансом, когда он меньше лимита', () => {
    expect(vetPointsSpendable(100000, 9000, 300, MAX)).toBe(300);
  });

  it('действует самое строгое из трёх ограничений', () => {
    expect(vetPointsSpendable(100000, 7000, 8000, MAX)).toBe(7000);
    expect(vetPointsSpendable(100000, 20000, 8000, MAX)).toBe(8000);
    expect(vetPointsSpendable(10000, 20000, 8000, MAX)).toBe(1000);
  });

  it('нулевой и отрицательный запрос не списывают ничего', () => {
    expect(vetPointsSpendable(100000, 0, 50000, MAX)).toBe(0);
    expect(vetPointsSpendable(100000, -500, 50000, MAX)).toBe(0);
  });

  it('нулевой баланс не списывает ничего', () => {
    expect(vetPointsSpendable(100000, 5000, 0, MAX)).toBe(0);
  });

  it('округление вниз: списать больше доступного нельзя даже на копейку', () => {
    // 10% от 333.33 = 33.333 → 33.33, а не 33.34
    expect(vetPointsSpendable(333.33, 1000, 1000, MAX)).toBe(33.33);
  });

  it('отрицательный баланс не превращается в списание', () => {
    expect(vetPointsSpendable(100000, 5000, -100, MAX)).toBe(0);
  });
});

describe('unitPriceWithContract — договорная цена покупателя', () => {
  const offer = {
    price: 10000,
    priceBreaks: [
      { minQty: 10, price: 9000 },
      { minQty: 50, price: 8000 },
    ],
  };

  it('без договора работает как обычный расчёт со скидками', () => {
    expect(unitPriceWithContract(offer, 1, null)).toBe(10000);
    expect(unitPriceWithContract(offer, 50, undefined)).toBe(8000);
  });

  it('договорная цена ниже прайса — действует она', () => {
    expect(unitPriceWithContract(offer, 1, 7500)).toBe(7500);
  });

  it('договорная цена выше прайса не поднимает цену', () => {
    // Прайс 10000, договор 12000 — покупатель платит 10000.
    expect(unitPriceWithContract(offer, 1, 12000)).toBe(10000);
  });

  it('если публичная скидка выгоднее договора — платит покупатель меньшую', () => {
    // Договор на 9500 при объёме 50: публичная скидка даёт 8000, и покупатель
    // платит 8000. Раньше договор перебивал расчёт, и покупатель с договором
    // платил больше случайного покупателя без него.
    expect(unitPriceForQty(offer, 50)).toBe(8000);
    expect(unitPriceWithContract(offer, 50, 9500)).toBe(8000);
  });

  it('договор ниже публичной скидки — действует договор', () => {
    expect(unitPriceWithContract(offer, 50, 7000)).toBe(7000);
  });

  it('договор — потолок цены, а не замена расчёта', () => {
    // На любом объёме покупатель с договором платит не больше, чем без него.
    for (const qty of [1, 9, 10, 49, 50, 500]) {
      const withoutContract = unitPriceWithContract(offer, qty, null);
      const withContract = unitPriceWithContract(offer, qty, 9500);
      expect(withContract).toBeLessThanOrEqual(withoutContract);
    }
  });

  it('договорная цена, равная нулю, считается заданной', () => {
    // Проверка на != null, а не на истинность: иначе бесплатная позиция по
    // договору молча превращалась бы в цену прайса.
    expect(unitPriceWithContract(offer, 1, 0)).toBe(0);
  });

  it('договорная цена учитывается и при фасовке', () => {
    const packed = { price: 20000, priceUnitQty: 1000, packSize: 5000 };
    expect(unitPriceWithContract(packed, 1, null)).toBe(100000);
    expect(unitPriceWithContract(packed, 1, 95000)).toBe(95000);
  });
});

describe('orderTotal — сумма заказа к оплате', () => {
  it('без доставки и баллов равна сумме позиций', () => {
    expect(orderTotal(100000, 0, 0)).toBe(100000);
  });

  it('доставка прибавляется', () => {
    expect(orderTotal(100000, 0, 45000)).toBe(145000);
  });

  it('баллы вычитаются', () => {
    expect(orderTotal(100000, 10000, 0)).toBe(90000);
  });

  it('доставка и баллы действуют одновременно', () => {
    expect(orderTotal(100000, 10000, 45000)).toBe(135000);
  });

  it('округляется до копеек', () => {
    expect(orderTotal(999.999, 0, 0.005)).toBe(1000);
  });

  it('мусор на входе не даёт NaN', () => {
    expect(orderTotal(NaN, 0, 0)).toBe(0);
    expect(orderTotal(1000, undefined as any, null as any)).toBe(1000);
  });

  it('комиссия считается от суммы позиций, а не от итога с доставкой', () => {
    // Платформа берёт процент со своей сделки, а не с работы перевозчика.
    const subtotal = 100000;
    const total = orderTotal(subtotal, 0, 45000);
    expect(total).toBe(145000);
    expect(percentOf(subtotal, 12)).toBe(12000);
    expect(percentOf(total, 12)).not.toBe(12000);
  });
});

describe('акции снижают цену', () => {
  const SELLER = 'seller-1';
  const PRODUCT = 'product-1';
  const offer = { price: 100000 };
  const promo = (over: Partial<PromotionLike> = {}): PromotionLike => ({
    sellerId: SELLER,
    productId: null,
    discountPercent: 10,
    startsAt: new Date('2026-09-01'),
    endsAt: null,
    isActive: true,
    ...over,
  });
  const NOW = new Date('2026-09-13T12:00:00Z');

  it('акция на весь ассортимент применяется к товару продавца', () => {
    expect(bestPromotionPercent([promo()], { sellerId: SELLER, productId: PRODUCT }, NOW)).toBe(10);
  });

  it('акция на другой товар не применяется', () => {
    expect(bestPromotionPercent([promo({ productId: 'other' })], { sellerId: SELLER, productId: PRODUCT }, NOW)).toBe(0);
  });

  it('акция другого продавца не применяется', () => {
    expect(bestPromotionPercent([promo({ sellerId: 'seller-2' })], { sellerId: SELLER, productId: PRODUCT }, NOW)).toBe(0);
  });

  it('не начавшаяся и закончившаяся акции не применяются', () => {
    expect(bestPromotionPercent([promo({ startsAt: new Date('2026-10-01') })], { sellerId: SELLER }, NOW)).toBe(0);
    expect(bestPromotionPercent([promo({ endsAt: new Date('2026-09-12') })], { sellerId: SELLER }, NOW)).toBe(0);
  });

  it('выключенная акция не применяется', () => {
    expect(bestPromotionPercent([promo({ isActive: false })], { sellerId: SELLER }, NOW)).toBe(0);
  });

  it('акции не складываются — берётся лучшая для покупателя', () => {
    const best = bestPromotionPercent(
      [promo({ discountPercent: 10 }), promo({ discountPercent: 25 }), promo({ discountPercent: 5 })],
      { sellerId: SELLER, productId: PRODUCT },
      NOW,
    );
    expect(best).toBe(25);
    // Именно лучшая, а не сумма 40%: сумма обнулила бы цену при трёх акциях.
    expect(applyPromotion(100000, best)).toBe(75000);
  });

  it('процент вне допустимого диапазона игнорируется', () => {
    expect(applyPromotion(100000, -20)).toBe(100000);
    expect(applyPromotion(100000, 0)).toBe(100000);
    // 100% — законная акция «в подарок», больше 100 обрезается до неё.
    expect(applyPromotion(100000, 100)).toBe(0);
    expect(applyPromotion(100000, 150)).toBe(0);
  });

  it('акция применяется к цене с объёмной скидкой, а не к базовой', () => {
    const withBreaks = { price: 100000, priceBreaks: [{ minQty: 10, price: 90000 }] };
    expect(unitPriceFinal(withBreaks, 10, null, 10)).toBe(81000);
    expect(unitPriceFinal(withBreaks, 1, null, 10)).toBe(90000);
  });

  it('покупатель платит меньшее из договорной цены и цены с акцией', () => {
    // Договорная дешевле акционной — платит договорную.
    expect(unitPriceFinal(offer, 1, 80000, 10)).toBe(80000);
    // Акционная дешевле договорной — платит акционную.
    expect(unitPriceFinal(offer, 1, 95000, 20)).toBe(80000);
    // Без акции поведение прежнее.
    expect(unitPriceFinal(offer, 1, 95000, 0)).toBe(95000);
  });

  it('договорная цена не уценивается акцией дополнительно', () => {
    // 10% от публичной 100000 = 90000; договорная 85000 остаётся как есть,
    // а не превращается в 76500.
    expect(unitPriceFinal(offer, 1, 85000, 10)).toBe(85000);
  });
});
