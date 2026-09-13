// Разбиение заказа на счета по продавцам.
//
// В заказе от нескольких поставщиков каждый выпускает свой документ: ИНН в нём
// его, реализация его. Значит, заказ нужно разложить на части так, чтобы части
// складывались обратно в сумму заказа — иначе покупатель получит счета, не
// сходящиеся с тем, что он платит.
//
// Доставка распределяется не пропорционально, а по факту: у каждого продавца
// своя доставка, посчитанная по его тарифу. Баллы — пропорционально стоимости
// товаров, потому что покупатель списывал их с заказа целиком, а не с части.

export interface SplitItem {
  sellerId: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface SellerInvoice {
  sellerId: string;
  items: SplitItem[];
  goods: number;
  delivery: number;
  // Доля списанных баллов, приходящаяся на этого продавца.
  vetPointsUsed: number;
  // Сумма к оплате по этому счёту: товары + доставка − доля баллов.
  total: number;
}

export function splitInvoices(
  items: SplitItem[],
  deliveryBySeller: Record<string, number>,
  vetPointsUsed: number,
): SellerInvoice[] {
  const bySeller = new Map<string, SplitItem[]>();
  for (const it of items) {
    const list = bySeller.get(it.sellerId) ?? [];
    list.push(it);
    bySeller.set(it.sellerId, list);
  }

  // Продавец может быть только в доставке: позиции тендера бывают без товара, а
  // доставку он всё равно выставил. Пропустить его значило бы потерять её из
  // суммы счетов.
  for (const sellerId of Object.keys(deliveryBySeller)) {
    if (sellerId && !bySeller.has(sellerId)) bySeller.set(sellerId, []);
  }

  const sellers = [...bySeller.keys()].sort();
  const goodsBySeller = new Map(
    sellers.map((id) => [id, round2(sum((bySeller.get(id) ?? []).map((it) => it.price * it.quantity)))]),
  );
  const goodsTotal = round2(sum([...goodsBySeller.values()]));
  const points = positive(vetPointsUsed);

  let pointsAssigned = 0;
  return sellers.map((sellerId, idx) => {
    const ownItems = bySeller.get(sellerId) ?? [];
    const goods = goodsBySeller.get(sellerId) ?? 0;
    const delivery = round2(positive(deliveryBySeller[sellerId]));

    // Последнему продавцу достаётся остаток: при делении возникают копейки, и
    // без этого сумма счетов расходилась бы с суммой заказа на копейку.
    const isLast = idx === sellers.length - 1;
    let share = 0;
    if (points > 0 && goodsTotal > 0) {
      share = isLast ? round2(points - pointsAssigned) : round2((points * goods) / goodsTotal);
      // Баллы не могут съесть больше, чем стоят товары этого продавца: иначе
      // счёт уйдёт в минус, а баллы оплачены с заказа, а не с позиции.
      share = Math.min(share, goods);
      pointsAssigned = round2(pointsAssigned + share);
    }

    return {
      sellerId,
      items: ownItems,
      goods,
      delivery,
      vetPointsUsed: share,
      total: round2(goods + delivery - share),
    };
  });
}

function positive(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function sum(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
