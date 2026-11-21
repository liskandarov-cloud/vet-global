// Выплаты продавцам: товары − доля комиссии заказа + доставка продавца.
// Без Prisma — чтобы расчёт проверялся юнит-тестами.
import { round2 } from '../common/pricing';
import { deliveryBySellerForOrder } from '../delivery/order-delivery';
import { splitOrderCommission } from './commission-split';

export interface BillingItem {
  sellerId: string;
  orderId: string;
  price: unknown;
  quantity: number;
  // Комиссия всего заказа: делится между его продавцами по выручке.
  orderCommission: unknown;
}

export interface BillingDeliveryOrder {
  deliveryQuote: unknown;
  shipments: { sellerId: string | null; cost: unknown }[];
}

export interface SellerBilling {
  orders: number;
  revenue: number;
  commission: number;
  delivery: number;
  payout: number;
}

export function sellerBilling(items: BillingItem[], deliveryOrders: BillingDeliveryOrder[]): Map<string, SellerBilling> {
  const acc = new Map<string, { revenue: number; delivery: number; orders: Set<string> }>();
  const bucket = (sellerId: string) => {
    const cur = acc.get(sellerId) ?? { revenue: 0, delivery: 0, orders: new Set<string>() };
    acc.set(sellerId, cur);
    return cur;
  };

  // Комиссия — записанная в заказе, поделённая между его продавцами
  // (commission-split.ts), а не пересчитанная от суммарной выручки.
  const byOrder = new Map<string, { commission: number; revenue: Record<string, number> }>();
  for (const it of items) {
    const line = Number(it.price) * it.quantity;
    const cur = bucket(it.sellerId);
    cur.revenue += line;
    cur.orders.add(it.orderId);
    const o = byOrder.get(it.orderId) ?? { commission: Number(it.orderCommission), revenue: {} };
    o.revenue[it.sellerId] = (o.revenue[it.sellerId] ?? 0) + line;
    byOrder.set(it.orderId, o);
  }
  // В тийинах, чтобы сумма по продавцам не набирала погрешность плавающей точки.
  const commissionTiyin = new Map<string, number>();
  for (const o of byOrder.values()) {
    for (const [sellerId, c] of Object.entries(splitOrderCommission(o.commission, o.revenue))) {
      commissionTiyin.set(sellerId, (commissionTiyin.get(sellerId) ?? 0) + Math.round(c * 100));
    }
  }

  // Доставка — по той же разбивке, по которой она попала в сумму заказа.
  for (const order of deliveryOrders) {
    const split = deliveryBySellerForOrder(
      order.deliveryQuote,
      order.shipments.map((sh) => ({ sellerId: sh.sellerId, cost: Number(sh.cost) })),
    );
    for (const [sellerId, cost] of Object.entries(split)) {
      // Пустой ключ — доставка без продавца (наследие): выплатить её некому.
      if (!sellerId) continue;
      bucket(sellerId).delivery += cost;
    }
  }

  const out = new Map<string, SellerBilling>();
  for (const [sellerId, v] of acc) {
    const revenue = round2(v.revenue);
    const commission = (commissionTiyin.get(sellerId) ?? 0) / 100;
    const delivery = round2(v.delivery);
    out.set(sellerId, { orders: v.orders.size, revenue, commission, delivery, payout: round2(revenue - commission + delivery) });
  }
  return out;
}

// Куда относится заказ в расчёте с продавцом — по тому, где деньги.
//
// Онлайн-оплаты (Click, Payme, Uzum) идут через площадку: она держит деньги и
// после доставки выплачивает продавцу товары за вычетом комиссии. Остальное
// покупатель платит продавцу напрямую (переводом по счёту, в том числе по
// отсрочке): деньги уже у продавца, и это он должен площадке комиссию. Отчёт
// показывал всё как «к выплате» — то есть выплату денег, которых площадка не
// получала. Недоставленное — «в работе»: его ещё могут отменить.
export type BillingBucket = 'payout' | 'direct' | 'inProgress';

export function billingBucket(orderStatus: string, paidViaPlatform: boolean): BillingBucket {
  if (orderStatus !== 'DELIVERED') return 'inProgress';
  return paidViaPlatform ? 'payout' : 'direct';
}

// Взаимозачёт: из выплаты удерживается комиссия по прямым оплатам. Плюс —
// площадка платит продавцу, минус — выставляет ему счёт.
export function settlement(payout: number, directCommission: number): number {
  return round2(payout - directCommission);
}
