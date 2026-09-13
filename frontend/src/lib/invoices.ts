// Счета заказа: их может быть несколько.
//
// Счёт-фактура — документ между двумя юрлицами, поэтому в заказе от нескольких
// поставщиков каждый выпускает свой. Раньше счёт был один на заказ и выставлялся
// от имени первого продавца, то есть от чужого имени и на чужие позиции.
//
// Отсюда и поведение кнопки «Счёт»: при одном поставщике скачивается один файл,
// при нескольких — по файлу на каждого.

export interface InvoiceOrder {
  id: string;
  items?: { sellerId?: string | null }[];
}

// Продавцы заказа в устойчивом порядке: иначе имена файлов менялись бы между
// нажатиями на одну и ту же кнопку.
export function invoiceSellerIds(order: InvoiceOrder): string[] {
  const ids = (order.items ?? []).map((it) => it.sellerId).filter(Boolean) as string[];
  return [...new Set(ids)].sort();
}

export function invoiceFileName(orderId: string, sellerId?: string): string {
  const base = `invoice-${orderId.slice(0, 8)}`;
  return sellerId ? `${base}-${sellerId.slice(0, 4)}.pdf` : `${base}.pdf`;
}

// Скачивает счета заказа и возвращает, сколько файлов получилось.
//
// Продавец не указывается, когда поставщик один: для такого заказа документ
// остаётся «на весь заказ», и его номер не меняется — он уже в ЭДО.
export async function downloadInvoices(
  order: InvoiceOrder,
  fetchPdf: (orderId: string, sellerId?: string) => Promise<unknown>,
  save: (data: unknown, filename: string) => void,
): Promise<number> {
  const sellers = invoiceSellerIds(order);
  if (sellers.length <= 1) {
    const data = await fetchPdf(order.id);
    save(data, invoiceFileName(order.id));
    return 1;
  }
  for (const sellerId of sellers) {
    const data = await fetchPdf(order.id, sellerId);
    save(data, invoiceFileName(order.id, sellerId));
  }
  return sellers.length;
}
