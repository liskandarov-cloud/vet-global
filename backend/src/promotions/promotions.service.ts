import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { bestPromotionPercent } from '../common/pricing';

// Проставление действующей акции товарам.
//
// Акция снижает цену по-настоящему, и эта цена должна быть одинаковой везде,
// где товар показывается: в каталоге, в избранном, на странице бренда, в боте.
// Пока расчёт жил внутри каталога, во всех остальных местах покупатель видел
// цену без скидки — то есть выше той, что спишется при заказе, и акция была
// невидима именно там, где должна привлекать.
@Injectable()
export class PromotionsService {
  constructor(private readonly prisma: PrismaService) {}

  // Дописывает promoPercent товарам и их офферам (0 — акции нет).
  //
  // Процент, а не готовая цена: цена зависит от количества (объёмные скидки) и
  // от договорной цены покупателя, и посчитать её заранее нельзя.
  async annotate(products: any[]): Promise<void> {
    const sellerIds = new Set<string>();
    for (const p of products) {
      if (p?.sellerId) sellerIds.add(p.sellerId);
      for (const o of Array.isArray(p?.offers) ? p.offers : []) {
        if (o?.sellerId) sellerIds.add(o.sellerId);
      }
    }
    if (!sellerIds.size) return;

    const now = new Date();
    const promotions = await this.prisma.promotion.findMany({
      where: {
        isActive: true,
        sellerId: { in: [...sellerIds] },
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gte: now } }],
      },
      select: {
        sellerId: true,
        productId: true,
        discountPercent: true,
        startsAt: true,
        endsAt: true,
        isActive: true,
      },
    });
    if (!promotions.length) return;

    for (const p of products) {
      p.promoPercent = bestPromotionPercent(promotions, { sellerId: p.sellerId, productId: p.id }, now);
      for (const o of Array.isArray(p?.offers) ? p.offers : []) {
        o.promoPercent = bestPromotionPercent(promotions, { sellerId: o.sellerId, productId: p.id }, now);
      }
    }
  }

  // Товары, на которые прямо сейчас действует акция.
  //
  // Нужен там, где показывают «акции» списком. Раньше такие списки опирались на
  // флаг isPromotion в карточке товара — это отдельная пометка продавца, никак
  // не связанная со скидкой: товар с флагом мог не иметь акции, а товар с
  // настоящей скидкой в список не попадал.
  async discountedProducts(take = 10) {
    const now = new Date();
    const promotions = await this.prisma.promotion.findMany({
      where: {
        isActive: true,
        discountPercent: { gt: 0 },
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gte: now } }],
      },
      select: { sellerId: true, productId: true, discountPercent: true },
    });
    if (!promotions.length) return [];

    // Акция на весь ассортимент продавца распространяется на все его товары,
    // поэтому список собирается и по товарам, и по продавцам.
    const productIds = promotions.map((p) => p.productId).filter(Boolean) as string[];
    const sellerIds = promotions.filter((p) => !p.productId).map((p) => p.sellerId);

    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        OR: [
          ...(productIds.length ? [{ id: { in: productIds } }] : []),
          ...(sellerIds.length ? [{ sellerId: { in: sellerIds } }] : []),
        ],
      },
      take,
      orderBy: { rating: 'desc' },
    });
    await this.annotate(products);
    return products;
  }
}
