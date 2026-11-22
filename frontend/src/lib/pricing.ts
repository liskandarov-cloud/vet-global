// Цена, которую увидит покупатель, — по тому же правилу, что считает сервер.
//
// Правило живёт в двух местах не по небрежности: сервер считает сумму заказа и
// никому не верит, а витрина должна показать ровно её, включая зависимость от
// количества. Поэтому здесь повторён порядок из backend/src/common/pricing.ts —
// объёмная скидка, затем акция, затем договорная цена как потолок. Любое
// расхождение этих двух реализаций означает, что в корзине одна цена, а
// списывается другая, поэтому правило собрано в одну функцию и покрыто тестами.

import type { Offer } from './types';

// Цена за единицу заказа (флакон, канистра) с учётом фасовки и объёмных скидок.
// packPrice приходит с бэкенда: price * packSize / priceUnitQty.
export function unitPriceForQty(offer: Offer | undefined, qty: number): number | undefined {
  if (!offer) return undefined;
  let price = offer.packPrice ?? offer.price;
  const breaks = [...(offer.priceBreaks ?? [])].sort((a, b) => a.minQty - b.minQty);
  for (const b of breaks) if (qty >= b.minQty) price = b.price;
  return price;
}

// Цена со снятым процентом акции. Процент вне 0..100 игнорируется: отрицательная
// «скидка» — это наценка, которой покупателю никто не обещал.
export function applyPromotion(price: number, percent?: number | null): number {
  const pct = Number(percent);
  if (!Number.isFinite(pct) || pct <= 0) return round2(Number(price) || 0);
  return round2((Number(price) || 0) * (1 - Math.min(100, pct) / 100));
}

// Итоговая цена единицы: объёмные скидки, акция и договорная цена вместе.
//
// Договорная цена — потолок, а не замена расчёта: покупатель платит меньшее из
// двух. Раньше витрина считала её заменой (договор перебивал объёмную скидку), и
// при выгодной объёмной скидке показывала цену выше той, что списывал сервер.
export function effectiveUnitPrice(
  offer: Offer | undefined,
  qty: number,
  contractPrice?: number | null,
  promoPercent?: number | null,
): number | undefined {
  const base = unitPriceForQty(offer, qty);
  if (base == null) return undefined;
  const promoted = applyPromotion(base, promoPercent ?? offer?.promoPercent);
  if (contractPrice == null) return promoted;
  return round2(Math.min(Number(contractPrice), promoted));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Оптовые ступени из формы продавца: пустые строки отбрасываются, остальные —
// по возрастанию количества. Каждая ступень — от 2 шт, количества не
// повторяются, и чем больше количество, тем ниже цена (и ниже базовой).
export function normalizePriceBreaks(
  rows: { minQty: unknown; price: unknown }[],
  basePrice: number,
): { breaks: { minQty: number; price: number }[]; error?: 'qty' | 'price' } {
  const breaks = rows
    .map((r) => ({ minQty: Math.floor(Number(r.minQty) || 0), price: Number(r.price) || 0 }))
    .filter((r) => r.minQty > 0 || r.price > 0)
    .sort((a, b) => a.minQty - b.minQty);
  if (breaks.some((b, i) => b.minQty < 2 || (i > 0 && b.minQty === breaks[i - 1].minQty))) return { breaks, error: 'qty' };
  if (breaks.some((b, i) => b.price <= 0 || b.price >= (i ? breaks[i - 1].price : basePrice))) return { breaks, error: 'price' };
  return { breaks };
}
