// Что в заказе принадлежит конкретному продавцу.
//
// В заказе от нескольких поставщиков почти всё существует во множественном
// числе: своя отправка у каждого, свой счёт-фактура, свои позиции. Продавец
// должен видеть и менять только своё — чужая отправка это чужая логистика, а
// чужой счёт — документ другого юрлица.
//
// Запасной вариант по пустому продавцу нужен для записей, созданных до
// разделения: у них поле не заполнено, и без него продавец не увидел бы
// собственный старый документ.

export interface OwnedRecord {
  sellerId?: string | null;
}

export interface SellerOrder {
  shipments?: OwnedRecord[] | null;
  invoices?: OwnedRecord[] | null;
  items?: { sellerId?: string | null }[] | null;
}

function own<T extends OwnedRecord>(list: T[] | null | undefined, sellerId?: string): T | undefined {
  const rows = list ?? [];
  return rows.find((r) => r.sellerId === sellerId) ?? rows.find((r) => !r.sellerId);
}

export function ownShipment<T extends OwnedRecord>(
  order: { shipments?: T[] | null } | null | undefined,
  sellerId?: string,
): T | undefined {
  return own(order?.shipments, sellerId);
}

export function ownInvoice<T extends OwnedRecord>(
  order: { invoices?: T[] | null } | null | undefined,
  sellerId?: string,
): T | undefined {
  return own(order?.invoices, sellerId);
}

// Позиции продавца в заказе: остальные его не касаются — ни количествами, ни
// ценами конкурентов.
export function ownItems<T extends { sellerId?: string | null }>(
  order: { items?: T[] | null } | null | undefined,
  sellerId?: string,
): T[] {
  return (order?.items ?? []).filter((i) => i.sellerId === sellerId);
}
