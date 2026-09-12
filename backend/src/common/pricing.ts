// Единая арифметика цены для офферов.
//
// В прайсе цена может быть указана за базовую единицу (например, «за 1000 доз»),
// а продаётся упаковка (флакон 3000/5000 доз). Покупатель заказывает упаковками,
// поэтому цена единицы заказа = price * packSize / priceUnitQty.
// Для обычных товаров priceUnitQty = packSize = 1 → цена не меняется.

export function packPriceOf(offer: any): number {
  const base = Number(offer?.price ?? 0);
  const unitQty = Number(offer?.priceUnitQty ?? 1) || 1;
  const packSize = Number(offer?.packSize ?? 1) || 1;
  return Math.round((base * packSize) / unitQty);
}

// Приведение оффера к виду для клиента: Decimal → number, packPrice — цена
// единицы заказа с учётом фасовки. Живёт здесь, а не в products.service,
// чтобы все эндпоинты отдавали офферы одинаково.
export function serializeOffer(o: any) {
  return {
    ...o,
    price: Number(o.price),
    packPrice: packPriceOf(o),
    ...(o.seller ? { seller: { ...o.seller, rating: Number(o.seller.rating ?? 0) } } : {}),
  };
}

// Цена за единицу заказа с учётом объёмных скидок (price breaks).
// Скидки задаются абсолютной ценой за единицу заказа и перебивают расчёт фасовки.
export function unitPriceForQty(offer: any, qty: number): number {
  let price = packPriceOf(offer);
  const breaks = Array.isArray(offer?.priceBreaks) ? offer.priceBreaks : [];
  for (const b of [...breaks].sort((a, b) => Number(a.minQty) - Number(b.minQty))) {
    if (b && qty >= Number(b.minQty)) price = Number(b.price);
  }
  return price;
}

// Цена единицы заказа с учётом договорной цены покупателя.
//
// Договорная цена перебивает и прайс, и объёмные скидки. Следствие, которое
// стоит держать в виду: если публичная скидка за объём окажется выгоднее
// договорной, покупатель с договором заплатит больше, чем случайный покупатель
// без договора. Поведение заложено изначально и здесь сохранено дословно, но
// раньше оно жило одной строкой внутри сборки заказа и было заметно только
// тому, кто её читал. Закреплено тестом, чтобы выбор был виден.
export function unitPriceWithContract(
  offer: any,
  qty: number,
  contractPrice?: number | null,
): number {
  if (contractPrice != null) return contractPrice;
  return unitPriceForQty(offer, qty);
}

// ── Денежная арифметика ───────────────────────────────────────────────────────
//
// Раньше эти формулы были вкраплены в orders.service и rfq.service двумя
// копиями. Комиссия платформы — основной доход, и считать её в двух местах
// по отдельности значит однажды разойтись.

// Округление до копеек. Деньги считаем так везде: результат произведения
// процентов на сумму почти никогда не целый, и без округления в базу уходили
// бы значения вида 119.99999999999999.
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Процент от суммы — комиссия платформы и начисление VetPoints.
export function percentOf(amount: number, pct: number): number {
  const a = Number(amount) || 0;
  const p = Number(pct) || 0;
  return round2((a * p) / 100);
}

// Сколько баллов покупатель реально может списать.
//
// Ограничений три, и действует самое строгое: сколько он попросил, сколько
// разрешено от суммы заказа и сколько у него есть. Округление вниз, а не к
// ближайшему: списать больше доступного нельзя даже на копейку.
export function vetPointsSpendable(
  subtotal: number,
  requested: number,
  balance: number,
  maxSpendPct: number,
): number {
  const req = Number(requested) || 0;
  if (req <= 0) return 0;
  const sub = Number(subtotal) || 0;
  const bal = Number(balance) || 0;
  const cap = (sub * (Number(maxSpendPct) || 0)) / 100;
  const used = Math.min(req, cap, bal);
  if (!(used > 0)) return 0;
  return Math.floor(used * 100) / 100;
}
