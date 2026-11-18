// Что продавец видит в заказе.
//
// Заказ может собирать позиции нескольких продавцов. Раньше каждый из них
// получал заказ целиком: позиции и цены конкурентов, общую сумму, платежи.
// Теперь продавцу отдаётся его часть: свои позиции, свои счета и отправки,
// суммы и комиссия по своим позициям; платежи — без сумм (сумма платежа
// раскрывает весь заказ). Заказ одного продавца не меняется.

import { splitOrderCommission } from '../analytics/commission-split';

const money = (v: unknown) => Math.round(Number(v ?? 0) * 100) / 100;

export function sellerView(order: any, sellerId: string): any {
  const items: any[] = order.items ?? [];
  const parts: any[] = order.parts ?? [];
  // Весь заказ — его: показываем как есть.
  if (items.length && items.every((it) => it.sellerId === sellerId) && !parts.some((p) => p.sellerId !== sellerId)) {
    return order;
  }
  const part = parts.find((p) => p.sellerId === sellerId);

  const revenue: Record<string, number> = {};
  for (const it of items) revenue[it.sellerId] = (revenue[it.sellerId] ?? 0) + Number(it.price) * Number(it.quantity);
  const own = money(revenue[sellerId]);
  const shipments = (order.shipments ?? []).filter((s: any) => s.sellerId === sellerId);
  const deliveryCost = money(shipments.reduce((sum: number, s: any) => sum + Number(s.cost ?? 0), 0));

  return {
    ...order,
    items: items.filter((it) => it.sellerId === sellerId),
    invoices: (order.invoices ?? []).filter((inv: any) => inv.sellerId === sellerId),
    shipments,
    payments: (order.payments ?? []).map((p: any) => ({ id: p.id, provider: p.provider, status: p.status, createdAt: p.createdAt })),
    subtotal: own,
    deliveryCost,
    total: money(own + deliveryCost),
    commission: splitOrderCommission(Number(order.commission ?? 0), revenue)[sellerId] ?? 0,
    // Баллы — скидка площадки, к расчётам с продавцом не относятся.
    vetPointsUsed: 0,
    vetPointsEarned: 0,
    // Статус — своей части; чужие части продавцу не показываются.
    status: part?.status ?? order.status,
    parts: part ? [part] : [],
    partial: true,
  };
}
