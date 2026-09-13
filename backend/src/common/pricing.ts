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
    // Процент действующей акции продавца (0 — акции нет). Цену с акцией считает
    // получатель: она зависит от количества и договорной цены покупателя.
    promoPercent: Number(o.promoPercent ?? 0),
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
// Берётся меньшая из двух: договорной и рассчитанной по прайсу с объёмными
// скидками. Раньше договорная цена просто перебивала расчёт, и у этого было
// следствие, которое никто не имел в виду: если публичная скидка за объём
// оказывалась выгоднее договора, покупатель с договором платил больше, чем
// случайный покупатель без него. Договор должен быть потолком цены, а не
// заменой расчёта.
// Оставлено отдельным именем как случай без акции: два независимых расчёта
// цены однажды разошлись бы, поэтому реализация одна — unitPriceFinal.
export function unitPriceWithContract(
  offer: any,
  qty: number,
  contractPrice?: number | null,
): number {
  return unitPriceFinal(offer, qty, contractPrice, 0);
}

// ── Денежная арифметика ───────────────────────────────────────────────────────
//
// Раньше эти формулы были вкраплены в orders.service и rfq.service двумя
// копиями. Комиссия платформы — основной доход, и считать её в двух местах
// по отдельности значит однажды разойтись.

// Округление до копеек. Деньги считаем так везде: результат произведения
// процентов на сумму почти никогда не целый, и без округления в базу уходили
// бы значения вида 119.99999999999999.
// Округление денег до копеек. Экспортируется, потому что та же арифметика нужна
// отчётам: третья копия этой строки рано или поздно округлила бы иначе, и отчёт
// разошёлся бы с проводками на копейки — ровно там, где по нему платят.
export function round2(n: number): number {
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

// Сумма заказа к оплате.
//
// Доставка прибавляется, списанные баллы вычитаются. Комиссия платформы
// считается отдельно и от subtotal, то есть доставку не облагает: платформа
// берёт процент со своей сделки, а не с работы перевозчика.
export function orderTotal(
  subtotal: number,
  vetPointsUsed: number,
  deliveryCost: number,
): number {
  const sub = Number(subtotal) || 0;
  const points = Number(vetPointsUsed) || 0;
  const delivery = Number(deliveryCost) || 0;
  return round2(sub - points + delivery);
}

// ── Акции ──────────────────────────────────────────────────────────────────
//
// Процент скидки у акции существовал и не читался нигде: продавец заводил
// «−15%», покупатель видел это на странице акций, а в каталоге и в заказе цена
// оставалась прежней. Платформа обещала скидку и не давала её.
//
// Решение владельца: акция снижает цену по-настоящему. Акции не складываются —
// берётся лучшая для покупателя. Договорная цена дополнительно не уценивается:
// она уже результат переговоров, и скидка поверх неё означала бы двойную уступку
// там, где продавец её не обещал.

export interface PromotionLike {
  sellerId: string;
  // Пусто — акция на все товары продавца.
  productId?: string | null;
  discountPercent: number;
  startsAt: Date | string;
  endsAt?: Date | string | null;
  isActive?: boolean;
}

// Лучший процент среди применимых акций. Ноль означает «скидки нет».
export function bestPromotionPercent(
  promotions: PromotionLike[],
  target: { sellerId: string; productId?: string | null },
  at: Date = new Date(),
): number {
  const now = at.getTime();
  let best = 0;
  for (const p of promotions ?? []) {
    if (!p || p.isActive === false) continue;
    if (p.sellerId !== target.sellerId) continue;
    // Акция без товара — на весь ассортимент продавца; с товаром — только на него.
    if (p.productId && p.productId !== target.productId) continue;
    if (new Date(p.startsAt).getTime() > now) continue;
    if (p.endsAt != null && new Date(p.endsAt).getTime() < now) continue;
    const pct = clampPercent(p.discountPercent);
    if (pct > best) best = pct;
  }
  return best;
}

// Цена со снятым процентом. Процент вне 0..100 игнорируется: в базе он может
// оказаться любым (правка вручную, импорт), а отрицательная скидка — это
// наценка, которой покупателю никто не обещал.
export function applyPromotion(price: number, percent: number): number {
  const pct = clampPercent(percent);
  if (!pct) return round2(Number(price) || 0);
  return round2((Number(price) || 0) * (1 - pct / 100));
}

// Итоговая цена единицы: объёмные скидки, акция и договорная цена вместе.
//
// Покупатель платит меньшее из двух: договорной цены и публичной цены с акцией.
// Порядок важен именно этим — акция применяется к публичной цене, а договорная
// остаётся потолком, как решено ранее.
export function unitPriceFinal(
  offer: any,
  qty: number,
  contractPrice?: number | null,
  promotionPercent = 0,
): number {
  const promoted = applyPromotion(unitPriceForQty(offer, qty), promotionPercent);
  if (contractPrice == null) return promoted;
  return round2(Math.min(Number(contractPrice), promoted));
}

function clampPercent(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(100, n);
}
