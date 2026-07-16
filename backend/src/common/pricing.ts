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
