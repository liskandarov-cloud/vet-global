// Сколько доставки в сумме заказа.
//
// Стоимость берётся из двух источников, и это не дублирование, а следствие
// порядка событий. Продавцам с тарифом её считают при оформлении — покупатель
// видит цифру до оплаты и платит ровно её. Продавцу без тарифа посчитать нечего,
// и он назначает стоимость позже, оформляя отправку; тогда сумма заказа
// пересчитывается (и только пока заказ не оплачен — см. syncOrderTotal).
//
// Если складывать всё подряд, продавец с тарифом возьмёт деньги дважды: один
// раз при оформлении, второй — когда заведёт отправку с той же стоимостью.
// Поэтому отправка учитывается только там, где при оформлении тарифа не нашли.

export type DeliveryQuote = Record<string, number>;

// Расчёт приходит из базы полем Json: что угодно, включая мусор от ручной
// правки. Числа проверяются, отрицательные отбрасываются — иначе такой записью
// можно было бы уменьшить сумму заказа.
export function parseQuote(raw: unknown): DeliveryQuote | null {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const out: DeliveryQuote = {};
  for (const [sellerId, value] of Object.entries(raw as Record<string, unknown>)) {
    const cost = Number(value);
    if (!sellerId || !Number.isFinite(cost) || cost < 0) continue;
    out[sellerId] = cost;
  }
  return out;
}

export function deliveryTotalForOrder(
  rawQuote: unknown,
  shipments: { sellerId?: string | null; cost: number }[],
): number {
  const quote = parseQuote(rawQuote);

  // Заказы, созданные до появления тарифов, расчёта не имеют: у них доставка —
  // это ровно то, что назначили продавцы, как и было раньше.
  if (!quote) {
    return sum(shipments.map((sh) => num(sh.cost)));
  }

  const quoted = sum(Object.values(quote));
  const extra = sum(
    shipments.filter((sh) => !sh.sellerId || !(sh.sellerId in quote)).map((sh) => num(sh.cost)),
  );
  return round2(quoted + extra);
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function sum(xs: number[]): number {
  return round2(xs.reduce((a, b) => a + b, 0));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
