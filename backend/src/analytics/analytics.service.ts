import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { percentOf, round2 } from '../common/pricing';
import { deliveryBySellerForOrder } from '../delivery/order-delivery';

// Отменённый заказ не выручка. Фильтр один для всех отчётов: раньше его не было
// вовсе, и отмены попадали и в GMV, и в комиссию, и в выплаты продавцам.
const NOT_CANCELLED = { status: { not: OrderStatus.CANCELLED } } as const;

@Injectable()
export class AnalyticsService {
  private readonly commissionPct: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    // Через ConfigService, как в orders и rfq: раньше здесь читался
    // process.env напрямую, в обход общей настройки приложения.
    this.commissionPct = Number(config.get('PLATFORM_COMMISSION_PERCENT') ?? 12);
  }

  // ── Admin: platform-wide summary (GMV, commission, top sellers) ──
  async adminStats() {
    const [totalUsers, totalSellers, totalBuyers, totalProducts, orders, pendingReviews, pendingSellers] =
      await this.prisma.$transaction([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { role: 'SELLER' } }),
        this.prisma.user.count({ where: { role: 'BUYER' } }),
        this.prisma.product.count(),
        this.prisma.order.findMany({
          where: NOT_CANCELLED,
          select: { subtotal: true, total: true, commission: true, status: true, createdAt: true },
        }),
        this.prisma.review.count({ where: { isApproved: false } }),
        this.prisma.user.count({ where: { role: 'SELLER', isVerified: false } }),
      ]);

    const gmv = orders.reduce((s, o) => s + Number(o.subtotal), 0);
    const commission = orders.reduce((s, o) => s + Number(o.commission), 0);
    const delivered = orders.filter((o) => o.status === OrderStatus.DELIVERED).length;

    // Лучшие продавцы по стоимости позиций в неотменённых заказах. Прежний
    // комментарий обещал «delivered», но фильтра не было вовсе — считались все,
    // включая отменённые.
    const items = await this.prisma.orderItem.findMany({
      where: { order: NOT_CANCELLED },
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
  //
  // Доставка учитывается отдельной строкой и комиссией не облагается.
  //
  // Деньги за доставку берутся с покупателя (они входят в сумму заказа), но до
  // этого не попадали в выплату никому: отчёт считал только товары, и доставка
  // молча оставалась у платформы, хотя организует её продавец — тарифы его,
  // перевозчика выбирает он. Комиссия от неё не берётся по тому же правилу, по
  // которому она не входит в базу комиссии в orderTotal: платформа берёт процент
  // со своей сделки, а не с работы перевозчика.
  async adminBilling() {
    const items = await this.prisma.orderItem.findMany({
      where: { order: NOT_CANCELLED },
      select: { sellerId: true, price: true, quantity: true, orderId: true },
    });

    const map = new Map<string, { revenue: number; delivery: number; orders: Set<string> }>();
    const bucket = (sellerId: string) => {
      const cur = map.get(sellerId) ?? { revenue: 0, delivery: 0, orders: new Set<string>() };
      map.set(sellerId, cur);
      return cur;
    };

    for (const it of items) {
      const cur = bucket(it.sellerId);
      cur.revenue += Number(it.price) * it.quantity;
      cur.orders.add(it.orderId);
    }

    // Доставка по той же разбивке, по которой она попадает в сумму заказа.
    const ordersWithDelivery = await this.prisma.order.findMany({
      where: { ...NOT_CANCELLED, OR: [{ deliveryCost: { gt: 0 } }, { shipments: { some: {} } }] },
      select: { deliveryQuote: true, shipments: { select: { sellerId: true, cost: true } } },
    });
    for (const order of ordersWithDelivery) {
      const split = deliveryBySellerForOrder(
        order.deliveryQuote,
        order.shipments.map((sh) => ({ sellerId: sh.sellerId, cost: Number(sh.cost) })),
      );
      for (const [sellerId, cost] of Object.entries(split)) {
        // Пустой ключ — доставка без продавца (наследие): выплатить её некому,
        // и приписывать произвольному продавцу нельзя.
        if (!sellerId) continue;
        bucket(sellerId).delivery += cost;
      }
    }

    const sellers = await this.prisma.user.findMany({
      where: { id: { in: [...map.keys()] } },
      select: { id: true, company: true },
    });

    const rows = [...map.entries()]
      .map(([id, v]) => {
        // percentOf, а не Math.round до целых: комиссия, записанная в заказе,
        // округляется до копеек, и отчёт с другим округлением расходился бы с
        // проводками — как раз там, где по нему выставляют счёт продавцу.
        const commission = percentOf(v.revenue, this.commissionPct);
        return {
          sellerId: id,
          company: sellers.find((s) => s.id === id)?.company ?? '—',
          orders: v.orders.size,
          revenue: v.revenue,
          commission,
          delivery: round2(v.delivery),
          payout: round2(v.revenue - commission + v.delivery),
        };
      })
      .sort((a, b) => b.revenue - a.revenue);

    const totals = rows.reduce(
      (t, r) => ({
        revenue: round2(t.revenue + r.revenue),
        commission: round2(t.commission + r.commission),
        delivery: round2(t.delivery + r.delivery),
        payout: round2(t.payout + r.payout),
      }),
      { revenue: 0, commission: 0, delivery: 0, payout: 0 },
    );

    return { commissionPercent: this.commissionPct, rows, totals };
  }

  // ── Seller dashboard ──
  async sellerStats(sellerId: string) {
    const items = await this.prisma.orderItem.findMany({
      // Без фильтра продавец видел в выручке и отменённые заказы.
      where: { sellerId, order: NOT_CANCELLED },
      include: { order: { select: { status: true, createdAt: true } } },
    });
    const revenue = items.reduce((s, it) => s + Number(it.price) * it.quantity, 0);

    const byProduct = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const it of items) {
      // У позиции сделки по тендеру нет товара каталога — группируем по названию.
      const key = it.productId ?? `name:${it.productName}`;
      const cur = byProduct.get(key) ?? { name: it.productName, qty: 0, revenue: 0 };
      cur.qty += it.quantity;
      cur.revenue += Number(it.price) * it.quantity;
      byProduct.set(key, cur);
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
      // Без фильтра покупатель видел в «потрачено» и отменённые заказы.
      where: { buyerId, ...NOT_CANCELLED },
      include: { items: true },
    });
    const totalSpent = orders.reduce((s, o) => s + Number(o.total), 0);

    // Category breakdown by spend.
    // Позиции сделок по тендеру не привязаны к товару — их из выборки исключаем.
    const productIds = orders
      .flatMap((o) => o.items.map((it) => it.productId))
      .filter((id): id is string => !!id);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { category: { select: { name: true } } },
    });
    const catOf = new Map(products.map((p) => [p.id, p.category?.name ?? 'Прочее']));
    const byCategory = new Map<string, number>();
    for (const o of orders) {
      for (const it of o.items) {
        // Сделки по тендеру без товара каталога попадают в «Прочее».
        const cat = (it.productId ? catOf.get(it.productId) : undefined) ?? 'Прочее';
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
