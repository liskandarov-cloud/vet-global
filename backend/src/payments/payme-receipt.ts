// Фискальные данные чека для Payme (поле detail в CheckPerformTransaction).
//
// Payme пробивает чек по этим строкам, и сумма строк обязана совпасть с суммой
// платежа до тийина: цена × количество − скидка + доставка. Списанные баллы
// VetPoints — скидка, разложенная по строкам пропорционально их сумме тем же
// делением с остатком, что и комиссия: округление по строкам иначе теряло бы
// тийины.

import { splitOrderCommission } from '../analytics/commission-split';

// НДС в Узбекистане — 12 %. Ставку определяет продавец: неплательщик НДС
// пробивает 0.
export const VAT_PERCENT = 12;

export interface ReceiptLine {
  productName: string;
  quantity: number;
  price: unknown; // за единицу, сум
  mxikCode?: string | null;
  packageCode?: string | null;
  vatPayer?: boolean;
}

export interface ReceiptOrder {
  total: unknown;
  deliveryCost?: unknown;
  vetPointsUsed?: unknown;
  items: ReceiptLine[];
}

export interface PaymeReceiptItem {
  title: string;
  price: number; // тийин за единицу
  count: number;
  code?: string;
  package_code?: string;
  vat_percent: number;
  discount: number; // тийин на всю строку
}

export interface PaymeDetail {
  receipt_type: 0;
  items: PaymeReceiptItem[];
  shipping?: { title: string; price: number };
}

const tiyin = (v: unknown) => Math.round((Number(v) || 0) * 100);

export function paymeReceiptDetail(order: ReceiptOrder): { detail: PaymeDetail; balanced: boolean } {
  const lineTotals = order.items.map((it) => tiyin(it.price) * it.quantity);
  const keys = order.items.map((_, i) => `l${String(i).padStart(4, '0')}`);
  const discountBy = splitOrderCommission(
    tiyin(order.vetPointsUsed) / 100,
    Object.fromEntries(keys.map((k, i) => [k, lineTotals[i] / 100])),
  );

  const items: PaymeReceiptItem[] = order.items.map((it, i) => ({
    // Payme обрезает длинные названия сам, но в чеке они нечитаемы.
    title: it.productName.slice(0, 128),
    price: tiyin(it.price),
    count: it.quantity,
    ...(it.mxikCode ? { code: it.mxikCode } : {}),
    ...(it.packageCode ? { package_code: it.packageCode } : {}),
    vat_percent: it.vatPayer ? VAT_PERCENT : 0,
    discount: tiyin(discountBy[keys[i]] ?? 0),
  }));

  const shippingPrice = tiyin(order.deliveryCost);
  const detail: PaymeDetail = {
    receipt_type: 0,
    items,
    ...(shippingPrice > 0 ? { shipping: { title: 'Доставка', price: shippingPrice } } : {}),
  };

  const sum = items.reduce((s, it) => s + it.price * it.count - it.discount, 0) + shippingPrice;
  return { detail, balanced: sum === tiyin(order.total) };
}
