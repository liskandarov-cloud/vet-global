// Что видит в письме каждый получатель уведомления о заказе.
//
// Покупателю и администратору — заказ целиком. Продавцу — только его позиции.
//
// Раньше письмо было одно на всех: в заказе от нескольких поставщиков каждый
// продавец получал перечень чужих товаров с количествами и ценами. Это прямая
// утечка коммерческих условий конкуренту, и заметить её было невозможно —
// письма уходят молча и никуда не записываются.

import { splitInvoices, type SplitItem } from '../orders/invoice-split';

export interface SummaryItem {
  sellerId: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface SellerSummary {
  sellerId: string;
  items: SummaryItem[];
  // Сумма по позициям этого продавца с его долей доставки и баллов.
  total: number;
}

// Позиции каждого продавца и сумма по ним.
export function summariesBySeller(
  items: SummaryItem[],
  deliveryBySeller: Record<string, number> = {},
  vetPointsUsed = 0,
): SellerSummary[] {
  const parts = splitInvoices(items as SplitItem[], deliveryBySeller, vetPointsUsed);
  return parts
    // Продавец без позиций в письме не нужен: сообщать ему нечего.
    .filter((p) => p.items.length > 0)
    .map((p) => ({
      sellerId: p.sellerId,
      items: p.items as SummaryItem[],
      total: p.total,
    }));
}
