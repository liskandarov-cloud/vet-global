import { creditOverdrawn, pointsOverdrawn } from './reservation';

// Проверка после резерва, а не до него.
//
// Лимит и баллы проверялись до транзакции, а списывались в ней безусловно.
// Несколько одновременных заказов видели один и тот же свободный остаток и
// проходили все: покупатель с лимитом 10 млн забирал по отсрочке товар на
// 50 млн, баллы уходили в минус. Теперь решение принимается по значению, которое
// вернуло само списание внутри транзакции (строка уже заблокирована), — и если
// остаток превышен, транзакция откатывается.
describe('резерв лимита и баллов при заказе', () => {
  it('лимит не превышен — можно', () => {
    expect(creditOverdrawn({ creditUsed: 10_000_000, creditLimit: 10_000_000 })).toBe(false);
    expect(creditOverdrawn({ creditUsed: 0, creditLimit: 0 })).toBe(false);
  });

  it('после резерва занято больше лимита — нельзя', () => {
    expect(creditOverdrawn({ creditUsed: 20_000_000, creditLimit: 10_000_000 })).toBe(true);
    expect(creditOverdrawn({ creditUsed: 10_000_000.01, creditLimit: 10_000_000 })).toBe(true);
  });

  it('значения Decimal из Prisma приходят строками/объектами — сравниваются как числа', () => {
    expect(creditOverdrawn({ creditUsed: '1500' as any, creditLimit: '1000' as any })).toBe(true);
    expect(creditOverdrawn({ creditUsed: { toString: () => '900' } as any, creditLimit: '1000' as any })).toBe(false);
  });

  it('баллы после списания не уходят в минус', () => {
    expect(pointsOverdrawn({ vetPointsBalance: 0 })).toBe(false);
    expect(pointsOverdrawn({ vetPointsBalance: 12.5 })).toBe(false);
    expect(pointsOverdrawn({ vetPointsBalance: -0.01 })).toBe(true);
    expect(pointsOverdrawn({ vetPointsBalance: '-300' as any })).toBe(true);
  });
});
