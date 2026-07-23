import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class MarketService {
  constructor(private readonly prisma: PrismaService) {}

  // Рыночные инсайты: спрос и цены по категориям + топ-товары (data-продукт для брендов).
  async insights() {
    const [categories, offers, items] = await Promise.all([
      this.prisma.category.findMany({ select: { id: true, name: true } }),
      this.prisma.offer.findMany({
        where: { isActive: true },
        select: { price: true, product: { select: { categoryId: true } } },
      }),
      this.prisma.orderItem.findMany({
        where: { order: { status: { not: OrderStatus.CANCELLED } } },
        select: {
          quantity: true,
          price: true,
          productId: true,
          productName: true,
          product: { select: { categoryId: true } },
        },
      }),
    ]);

    // Цены по категориям (min / avg / max).
    const priceByCat = new Map<string, number[]>();
    for (const o of offers) {
      const cid = o.product.categoryId;
      if (!priceByCat.has(cid)) priceByCat.set(cid, []);
      priceByCat.get(cid)!.push(Number(o.price));
    }

    // Спрос по категориям (единицы / выручка).
    const demandByCat = new Map<string, { units: number; revenue: number }>();
    // Топ-товары.
    const byProduct = new Map<string, { name: string; units: number; revenue: number }>();
    for (const it of items) {
      // Позиции сделок по тендеру не привязаны к товару каталога — в рыночную
      // аналитику по категориям они не попадают (категории у них нет).
      if (!it.product || !it.productId) continue;
      const cid = it.product.categoryId;
      const rev = Number(it.price) * it.quantity;
      const d = demandByCat.get(cid) ?? { units: 0, revenue: 0 };
      d.units += it.quantity;
      d.revenue += rev;
      demandByCat.set(cid, d);

      const p = byProduct.get(it.productId) ?? { name: it.productName, units: 0, revenue: 0 };
      p.units += it.quantity;
      p.revenue += rev;
      byProduct.set(it.productId, p);
    }

    const cats = categories.map((c) => {
      const prices = priceByCat.get(c.id) ?? [];
      const demand = demandByCat.get(c.id) ?? { units: 0, revenue: 0 };
      const min = prices.length ? Math.min(...prices) : 0;
      const max = prices.length ? Math.max(...prices) : 0;
      const avg = prices.length ? Math.round(prices.reduce((s, x) => s + x, 0) / prices.length) : 0;
      return {
        category: c.name,
        offers: prices.length,
        priceMin: min,
        priceAvg: avg,
        priceMax: max,
        demandUnits: demand.units,
        demandRevenue: Math.round(demand.revenue),
      };
    });

    const topProducts = [...byProduct.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8)
      .map((p) => ({ name: p.name, units: p.units, revenue: Math.round(p.revenue) }));

    const totalRevenue = cats.reduce((s, c) => s + c.demandRevenue, 0);
    const totalUnits = cats.reduce((s, c) => s + c.demandUnits, 0);

    return { categories: cats, topProducts, totals: { revenue: totalRevenue, units: totalUnits } };
  }

  // Позиция продавца: доля в категориях + ценовое позиционирование против рынка.
  async myPosition(user: AuthUser) {
    const [myItems, allItems, myOffers] = await Promise.all([
      this.prisma.orderItem.findMany({
        where: { sellerId: user.id, order: { status: { not: OrderStatus.CANCELLED } } },
        select: { quantity: true, price: true, product: { select: { categoryId: true, category: { select: { name: true } } } } },
      }),
      this.prisma.orderItem.findMany({
        where: { order: { status: { not: OrderStatus.CANCELLED } } },
        select: { quantity: true, price: true, product: { select: { categoryId: true } } },
      }),
      this.prisma.offer.findMany({
        where: { sellerId: user.id, isActive: true },
        select: { price: true, productId: true, product: { select: { name: true } } },
      }),
    ]);

    // Выручка по категориям: моя vs рынок.
    const mine = new Map<string, { name: string; revenue: number }>();
    for (const it of myItems) {
      if (!it.product) continue; // позиция сделки по тендеру — без категории
      const cid = it.product.categoryId;
      const m = mine.get(cid) ?? { name: it.product.category.name, revenue: 0 };
      m.revenue += Number(it.price) * it.quantity;
      mine.set(cid, m);
    }
    const market = new Map<string, number>();
    for (const it of allItems) {
      if (!it.product) continue;
      const cid = it.product.categoryId;
      market.set(cid, (market.get(cid) ?? 0) + Number(it.price) * it.quantity);
    }
    const categoryShare = [...mine.entries()].map(([cid, m]) => {
      const marketRev = market.get(cid) ?? 0;
      return {
        category: m.name,
        myRevenue: Math.round(m.revenue),
        marketRevenue: Math.round(marketRev),
        sharePct: marketRev > 0 ? Math.round((m.revenue / marketRev) * 100) : 0,
      };
    });

    // Ценовое позиционирование: моя цена vs минимальная/средняя рыночная по товару.
    const productIds = myOffers.map((o) => o.productId);
    const marketOffers = productIds.length
      ? await this.prisma.offer.findMany({
          where: { productId: { in: productIds }, isActive: true },
          select: { price: true, productId: true },
        })
      : [];
    const marketByProduct = new Map<string, number[]>();
    for (const o of marketOffers) {
      if (!marketByProduct.has(o.productId)) marketByProduct.set(o.productId, []);
      marketByProduct.get(o.productId)!.push(Number(o.price));
    }
    const pricePositioning = myOffers.map((o) => {
      const prices = marketByProduct.get(o.productId) ?? [Number(o.price)];
      const marketMin = Math.min(...prices);
      const marketAvg = Math.round(prices.reduce((s, x) => s + x, 0) / prices.length);
      const my = Number(o.price);
      return {
        product: o.product.name,
        myPrice: my,
        marketMin,
        marketAvg,
        deltaPct: marketAvg > 0 ? Math.round(((my - marketAvg) / marketAvg) * 100) : 0,
        isCheapest: my <= marketMin,
      };
    });

    const myRevenue = categoryShare.reduce((s, c) => s + c.myRevenue, 0);
    return { myRevenue, categoryShare, pricePositioning };
  }
}
