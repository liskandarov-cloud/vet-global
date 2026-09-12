import {
  packPriceOf,
  unitPriceForQty,
  unitPriceWithContract,
  percentOf,
  vetPointsSpendable,
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

  it('договорная цена перебивает прайс', () => {
    expect(unitPriceWithContract(offer, 1, 7500)).toBe(7500);
  });

  it('договорная цена перебивает и объёмные скидки — даже если те выгоднее', () => {
    // Следствие заложенного поведения: покупатель с договором на 9500 при
    // объёме 50 заплатит 9500, тогда как публичная скидка дала бы 8000.
    // То есть договор может оказаться дороже открытого прайса. Решение
    // намеренное, и тест существует, чтобы оно не осталось незамеченным.
    expect(unitPriceWithContract(offer, 50, 9500)).toBe(9500);
    expect(unitPriceForQty(offer, 50)).toBe(8000);
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
