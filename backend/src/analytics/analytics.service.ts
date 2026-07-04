import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Admin: platform-wide summary (GMV, commission, top sellers) ──
  async adminStats() {
    const [totalUsers, totalSellers, totalBuyers, totalProducts, orders, pendingReviews, pendingSellers] =
      await this.prisma.$transaction([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { role: 'SELLER' } }),
        this.prisma.user.count({ where: { role: 'BUYER' } }),
        this.prisma.product.count(),
        this.prisma.order.findMany({ select: { subtotal: true, total: true, commission: true, status: true, createdAt: true } }),
        this.prisma.review.count({ where: { isApproved: false } }),
        this.prisma.user.count({ where: { role: 'SELLER', isVerified: false } }),
      ]);

    const gmv = orders.reduce((s, o) => s + Number(o.subtotal), 0);
    const commission = orders.reduce((s, o) => s + Number(o.commission), 0);
    const delivered = orders.filter((o) => o.status === OrderStatus.DELIVERED).length;

    // Top sellers by delivered items value.
    const items = await this.prisma.orderItem.findMany({
      select: { sellerId: true, price: true, quantity: true },
    });
    const bySeller = new Map<string, number>();
    for (const it of items) {
      bySeller.set(it.sellerId, (bySeller.get(it.sellerId) ?? 0) + Number(it.price) * it.quantity);
    }
    const topSellerIds = [...bySeller.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    const sellers = await this.prisma.user.findMany({
      where: { id: { in: topSellerIds.map(([id]) => id) } },
      select: { id: true, company: true },
    });
    const topSellers = topSellerIds.map(([id, revenue]) => ({
      id,
      company: sellers.find((s) => s.id === id)?.company ?? '—',
      revenue,
    }));

    // Orders per week (last 8 weeks).
    const ordersByWeek = this.groupByWeek(orders.map((o) => o.createdAt));

    return {
      totalUsers,
      totalSellers,
      totalBuyers,
      totalProducts,
      totalOrders: orders.length,
      deliveredOrders: delivered,
      pendingReviews,
      pendingSellers,
      gmv,
      commission,
      topSellers,
      ordersByWeek,
    };
  }

  // ── Admin billing: per-seller revenue / commission / payout ──
  async adminBilling() {
    const pct = Number(process.env.PLATFORM_COMMISSION_PERCENT ?? 12);
    const items = await this.prisma.orderItem.findMany({
      select: { sellerId: true, price: true, quantity: true, orderId: true },
    });

    const map = new Map<string, { revenue: number; orders: Set<string> }>();
    for (const it of items) {
      const cur = map.get(it.sellerId) ?? { revenue: 0, orders: new Set<string>() };
      cur.revenue += Number(it.price) * it.quantity;
      cur.orders.add(it.orderId);
      map.set(it.sellerId, cur);
    }

    const sellers = await this.prisma.user.findMany({
      where: { id: { in: [...map.keys()] } },
      select: { id: true, company: true },
    });

    const rows = [...map.entries()]
      .map(([id, v]) => {
        const commission = Math.round((v.revenue * pct) / 100);
        return {
          sellerId: id,
          company: sellers.find((s) => s.id === id)?.company ?? '—',
          orders: v.orders.size,
          revenue: v.revenue,
          commission,
          payout: v.revenue - commission,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);

    const totals = rows.reduce(
      (t, r) => ({ revenue: t.revenue + r.revenue, commission: t.commission + r.commission, payout: t.payout + r.payout }),
      { revenue: 0, commission: 0, payout: 0 },
    );

    return { commissionPercent: pct, rows, totals };
  }

  // ── Seller dashboard ──
  async sellerStats(sellerId: string) {
    const items = await this.prisma.orderItem.findMany({
      where: { sellerId },
      include: { order: { select: { status: true, createdAt: true } } },
    });
    const revenue = items.reduce((s, it) => s + Number(it.price) * it.quantity, 0);

    const byProduct = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const it of items) {
      const cur = byProduct.get(it.productId) ?? { name: it.productName, qty: 0, revenue: 0 };
      cur.qty += it.quantity;
      cur.revenue += Number(it.price) * it.quantity;
      byProduct.set(it.productId, cur);
    }
    const topProducts = [...byProduct.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    const productsCount = await this.prisma.product.count({ where: { sellerId } });
    const ordersCount = new Set(items.map((it) => it.orderId)).size;

    return {
      revenue,
      productsCount,
      ordersCount,
      topProducts,
      ordersByWeek: this.groupByWeek(items.map((it) => it.order.createdAt)),
    };
  }

  // ── Buyer dashboard ──
  async buyerStats(buyerId: string) {
    const orders = await this.prisma.order.findMany({
      where: { buyerId },
      include: { items: true },
    });
    const totalSpent = orders.reduce((s, o) => s + Number(o.total), 0);

    // Category breakdown by spend.
    const productIds = orders.flatMap((o) => o.items.map((it) => it.productId));
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { category: { select: { name: true } } },
    });
    const catOf = new Map(products.map((p) => [p.id, p.category?.name ?? 'Прочее']));
    const byCategory = new Map<string, number>();
    for (const o of orders) {
      for (const it of o.items) {
        const cat = catOf.get(it.productId) ?? 'Прочее';
        byCategory.set(cat, (byCategory.get(cat) ?? 0) + Number(it.price) * it.quantity);
      }
    }

    return {
      totalSpent,
      ordersCount: orders.length,
      byCategory: [...byCategory.entries()].map(([name, value]) => ({ name, value })),
      spendByMonth: this.groupByMonth(orders.map((o) => ({ date: o.createdAt, value: Number(o.total) }))),
    };
  }

  private groupByWeek(dates: Date[]) {
    const buckets = new Map<string, number>();
    for (const d of dates) {
      const key = this.weekKey(new Date(d));
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    return [...buckets.entries()].sort().slice(-8).map(([week, count]) => ({ week, count }));
  }

  private groupByMonth(rows: { date: Date; value: number }[]) {
    const buckets = new Map<string, number>();
    for (const r of rows) {
      const d = new Date(r.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      buckets.set(key, (buckets.get(key) ?? 0) + r.value);
    }
    return [...buckets.entries()].sort().slice(-12).map(([month, value]) => ({ month, value }));
  }

  private weekKey(d: Date): string {
    const onejan = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
    return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
  }
}
