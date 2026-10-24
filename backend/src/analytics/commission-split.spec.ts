import { splitOrderCommission } from './commission-split';

const sum = (r: Record<string, number>) =>
  Math.round(Object.values(r).reduce((a, b) => a + b * 100, 0));

describe('splitOrderCommission', () => {
  it('один продавец получает всю комиссию заказа', () => {
    expect(splitOrderCommission(31110.91, { a: 259257.6 })).toEqual({ a: 31110.91 });
  });

  it('несколько продавцов — пропорционально выручке', () => {
    expect(splitOrderCommission(120, { a: 750, b: 250 })).toEqual({ a: 90, b: 30 });
  });

  it('сумма долей всегда в точности равна комиссии заказа', () => {
    const cases: [number, Record<string, number>][] = [
      [0.01, { a: 1, b: 1, c: 1 }],
      [100, { a: 1, b: 1, c: 1 }],
      [31110.91, { a: 100000.33, b: 159257.27 }],
      [12.35, { x: 33.33, y: 33.33, z: 36.25 }],
    ];
    for (const [commission, revenue] of cases) {
      expect(sum(splitOrderCommission(commission, revenue))).toBe(Math.round(commission * 100));
    }
  });

  // Ровно тот случай, на котором отчёт по выплатам разошёлся с проводками.
  it('три заказа по 86 419,20 × 3: отчёт сходится с записанной комиссией', () => {
    const perOrder = 31110.91; // percentOf(259257.6, 12)
    let tiyin = 0;
    for (let i = 0; i < 3; i++) tiyin += Math.round(splitOrderCommission(perOrder, { a: 259257.6 }).a * 100);
    expect(tiyin / 100).toBe(93332.73);
  });

  it('без выручки делит поровну, без продавцов — пусто', () => {
    expect(splitOrderCommission(0.03, { a: 0, b: 0, c: 0 })).toEqual({ a: 0.01, b: 0.01, c: 0.01 });
    expect(splitOrderCommission(10, {})).toEqual({});
  });
});
