// Проверка кредитного лимита и баллов ПОСЛЕ их резерва в транзакции заказа.
//
// Раньше остаток проверялся до транзакции, а списывался в ней безусловно, и
// одновременные заказы проходили все по одному и тому же «свободному»
// остатку: лимит отсрочки превышался в разы, баллы уходили в минус.
//
// Порядок теперь обратный: сначала атомарное изменение (UPDATE берёт блокировку
// строки покупателя, параллельный заказ ждёт и видит уже изменённое значение),
// затем проверка того, что вернуло само изменение. Превышение — откат всей
// транзакции, включая списание склада.

type Num = number | string | { toString(): string } | null | undefined;

const num = (v: Num) => Number(v ?? 0);

// Копейка запаса на округление Decimal(12, 2).
const EPS = 0.005;

export function creditOverdrawn(after: { creditUsed: Num; creditLimit: Num }): boolean {
  return num(after.creditUsed) > num(after.creditLimit) + EPS;
}

export function pointsOverdrawn(after: { vetPointsBalance: Num }): boolean {
  return num(after.vetPointsBalance) < -EPS;
}
