import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApprovalStatus, OrderStatus, OrgRole, PaymentTerm, UserRole, VetPointsType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/order.dto';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { PdfService } from '../documents/pdf.service';
import { NotificationsService } from '../mail/notifications.service';

@Injectable()
export class OrdersService {
  private readonly commissionPct: number;
  private readonly earnPct: number;
  private readonly maxSpendPct: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly pdf: PdfService,
    private readonly notifications: NotificationsService,
  ) {
    this.commissionPct = Number(config.get('PLATFORM_COMMISSION_PERCENT') ?? 12);
    this.earnPct = Number(config.get('VETPOINTS_EARN_PERCENT') ?? 1);
    this.maxSpendPct = Number(config.get('VETPOINTS_MAX_SPEND_PERCENT') ?? 10);
  }

  async create(dto: CreateOrderDto, user?: AuthUser) {
    // Resolve products + offers from DB (never trust client-supplied prices).
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({ where: { id: { in: productIds } } });
    if (products.length !== new Set(productIds).size) {
      throw new BadRequestException('Some products were not found');
    }

    const offerIds = dto.items.map((i) => i.offerId).filter(Boolean) as string[];
    const offers = offerIds.length
      ? await this.prisma.offer.findMany({ where: { id: { in: offerIds } } })
      : [];
    const offerMap = new Map(offers.map((o) => [o.id, o]));

    const items = dto.items.map((i) => {
      const p = products.find((x) => x.id === i.productId)!;

      // По умолчанию — базовый товар (легаси). Если выбран оффер — цена/продавец/квант из него.
      let sellerId = p.sellerId;
      let minOrder = p.minOrder;
      let unitPrice = Number(p.price);
      let offerId: string | null = null;

      if (i.offerId) {
        const o = offerMap.get(i.offerId);
        if (!o || o.productId !== p.id) {
          throw new BadRequestException(`Предложение для «${p.name}» не найдено`);
        }
        if (!o.isActive || !o.inStock) {
          throw new BadRequestException(`Предложение для «${p.name}» недоступно`);
        }
        sellerId = o.sellerId;
        minOrder = o.minOrder;
        unitPrice = unitPriceForQty(o, i.quantity);
        offerId = o.id;
      }

      if (i.quantity < minOrder) {
        throw new BadRequestException(`Минимальный заказ для «${p.name}» — ${minOrder} шт.`);
      }

      return {
        productId: p.id,
        offerId,
        productName: p.name,
        sellerId,
        quantity: i.quantity,
        price: unitPrice,
      };
    });

    const subtotal = items.reduce((s, it) => s + it.price * it.quantity, 0);

    // VetPoints spend — only for authenticated buyers, capped at maxSpendPct of subtotal & balance.
    let vetPointsUsed = 0;
    if (user && dto.vetPointsUsed && dto.vetPointsUsed > 0) {
      const balance = Number(
        (await this.prisma.user.findUnique({ where: { id: user.id } }))?.vetPointsBalance ?? 0,
      );
      const cap = (subtotal * this.maxSpendPct) / 100;
      vetPointsUsed = Math.min(dto.vetPointsUsed, cap, balance);
      vetPointsUsed = Math.floor(vetPointsUsed * 100) / 100;
    }

    const total = subtotal - vetPointsUsed;
    const commission = Math.round(((subtotal * this.commissionPct) / 100) * 100) / 100;
    const vetPointsEarned = Math.round(((subtotal * this.earnPct) / 100) * 100) / 100;

    const buyerName = dto.buyerName ?? user?.fullName ?? 'Гость';
    const buyerPhone = dto.buyerPhone ?? user?.phone ?? '';
    const buyerCompany = dto.buyerCompany ?? user?.company ?? null;
    if (!buyerName || !buyerPhone) {
      throw new BadRequestException('Укажите имя и телефон для оформления заказа');
    }

    // ── Условия оплаты / финансирование (блок 2) ──
    const paymentTerm = dto.paymentTerm ?? PaymentTerm.PREPAY;
    let netTermDays: number | null = null;
    let dueDate: Date | null = null;
    let installments: number | null = null;
    let paymentSchedule: { n: number; dueDate: string; amount: number }[] | null = null;
    let creditToReserve = 0;

    if (paymentTerm !== PaymentTerm.PREPAY) {
      if (!user) throw new BadRequestException('Отсрочка и рассрочка доступны только авторизованным покупателям');
      const buyer = await this.prisma.user.findUnique({
        where: { id: user.id },
        select: { creditLimit: true, creditUsed: true },
      });
      const available = Number(buyer?.creditLimit ?? 0) - Number(buyer?.creditUsed ?? 0);
      if (total > available) {
        throw new BadRequestException(
          `Недостаточно кредитного лимита: доступно ${Math.floor(available)}. Подайте заявку на финансирование.`,
        );
      }
      creditToReserve = total;
      const base = new Date();

      if (paymentTerm === PaymentTerm.NET_TERMS) {
        netTermDays = dto.netTermDays ?? 30;
        dueDate = new Date(base.getTime() + netTermDays * 86400000);
      } else {
        const n = dto.installments ?? 3;
        installments = n;
        const per = Math.round((total / n) * 100) / 100;
        paymentSchedule = Array.from({ length: n }, (_, i) => ({
          n: i + 1,
          dueDate: new Date(base.getFullYear(), base.getMonth() + i + 1, base.getDate()).toISOString(),
          // последний платёж добирает остаток от округлений
          amount: i === n - 1 ? Math.round((total - per * (n - 1)) * 100) / 100 : per,
        }));
        dueDate = new Date(paymentSchedule[paymentSchedule.length - 1].dueDate);
      }
    }

    // ── Организация: согласование заказа сверх лимита закупщика ──
    let orgId: string | null = null;
    let approvalStatus: ApprovalStatus = ApprovalStatus.NONE;
    if (user) {
      const membership = await this.prisma.orgMembership.findFirst({ where: { userId: user.id } });
      if (membership) {
        orgId = membership.orgId;
        // OWNER/MANAGER не требуют согласования; закупщик — если сумма превышает лимит (0 = всегда).
        if (membership.role === OrgRole.PURCHASER && total > Number(membership.spendLimit)) {
          approvalStatus = ApprovalStatus.PENDING;
        }
      }
    }

    // Create order + deduct spent points atomically.
    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          buyerId: user?.id ?? null,
          counterpartyId: dto.counterpartyId ?? null,
          buyerName,
          buyerPhone,
          buyerCompany,
          subtotal,
          vetPointsUsed,
          total,
          vetPointsEarned,
          commission,
          paymentTerm,
          netTermDays,
          dueDate,
          installments,
          paymentSchedule: (paymentSchedule as any) ?? undefined,
          orgId,
          approvalStatus,
          items: { create: items },
        },
        include: { items: true },
      });

      // Резервируем кредитный лимит под отсрочку/рассрочку.
      if (user && creditToReserve > 0) {
        await tx.user.update({
          where: { id: user.id },
          data: { creditUsed: { increment: creditToReserve } },
        });
      }

      if (user && vetPointsUsed > 0) {
        await tx.user.update({
          where: { id: user.id },
          data: { vetPointsBalance: { decrement: vetPointsUsed } },
        });
        await tx.vetPointsTransaction.create({
          data: {
            userId: user.id,
            amount: -vetPointsUsed,
            type: VetPointsType.SPENT,
            description: `Оплата заказа #${created.id.slice(0, 8)}`,
            orderId: created.id,
          },
        });
      }
      return created;
    });

    // Notify buyer + sellers + admin (fire-and-forget; email failures must not break checkout).
    void this.notifications.onOrderCreated(order.id).catch(() => undefined);
    // TODO(phase-2): Telegram routing to seller/admin (SRS 4.2).
    return this.serialize(order);
  }

  async list(user: AuthUser, status?: OrderStatus) {
    const where: any = {};
    if (user.role === UserRole.BUYER) {
      where.buyerId = user.id;
    } else if (user.role === UserRole.SELLER) {
      where.items = { some: { sellerId: user.id } };
    }
    if (status) where.status = status;

    const orders = await this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { items: true, invoice: true, shipment: true, payments: true },
      take: 200,
    });
    return orders.map((o) => this.serialize(o));
  }

  async getOne(id: string, user: AuthUser) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true, invoice: true, shipment: true, payments: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    this.assertAccess(order, user);
    return this.serialize(order);
  }

  async updateStatus(id: string, status: OrderStatus, user: AuthUser) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: { items: true } });
    if (!order) throw new NotFoundException('Order not found');

    // Seller may only touch orders containing their items.
    if (user.role === UserRole.SELLER && !order.items.some((it) => it.sellerId === user.id)) {
      throw new ForbiddenException('Not authorized for this order');
    }

    await this.prisma.order.update({ where: { id }, data: { status } });

    // Credit earned VetPoints once, on delivery.
    if (status === OrderStatus.DELIVERED && order.buyerId) {
      const already = await this.prisma.vetPointsTransaction.findFirst({
        where: { orderId: id, type: VetPointsType.EARNED },
      });
      const earned = Number(order.vetPointsEarned);
      if (!already && earned > 0) {
        await this.prisma.$transaction([
          this.prisma.user.update({
            where: { id: order.buyerId },
            data: { vetPointsBalance: { increment: earned } },
          }),
          this.prisma.vetPointsTransaction.create({
            data: {
              userId: order.buyerId,
              amount: earned,
              type: VetPointsType.EARNED,
              description: `Начислено за заказ #${id.slice(0, 8)}`,
              orderId: id,
            },
          }),
        ]);
      }
    }

    void this.notifications.onOrderStatusChanged(id, status).catch(() => undefined);
    return this.getOne(id, user);
  }

  // Generates (and records) the invoice PDF for a confirmed order.
  async invoicePdf(id: string, user: AuthUser): Promise<{ buffer: Buffer; number: string }> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true, invoice: true, shipment: true, payments: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    this.assertAccess(order, user);

    const number = order.invoice?.number ?? `VG-${order.createdAt.getFullYear()}-${order.id.slice(0, 8).toUpperCase()}`;
    if (!order.invoice) {
      await this.prisma.invoice.create({
        data: { orderId: order.id, number, amount: order.total },
      });
    }

    const seller = await this.prisma.user.findFirst({
      where: { id: order.items[0]?.sellerId },
      select: { company: true, inn: true },
    });

    const buffer = await this.pdf.invoice({
      number,
      date: order.createdAt,
      seller: { company: seller?.company, inn: seller?.inn },
      buyer: {
        name: order.buyerName,
        company: order.buyerCompany,
        phone: order.buyerPhone,
      },
      items: order.items.map((it) => ({
        name: it.productName,
        quantity: it.quantity,
        price: Number(it.price),
      })),
      subtotal: Number(order.subtotal),
      vetPointsUsed: Number(order.vetPointsUsed),
      total: Number(order.total),
    });

    return { buffer, number };
  }

  private assertAccess(order: any, user: AuthUser) {
    if (user.role === UserRole.ADMIN) return;
    if (user.role === UserRole.BUYER && order.buyerId !== user.id) {
      throw new ForbiddenException('Not authorized');
    }
    if (user.role === UserRole.SELLER && !order.items?.some((it: any) => it.sellerId === user.id)) {
      throw new ForbiddenException('Not authorized');
    }
  }

  private serialize(o: any) {
    return {
      ...o,
      subtotal: Number(o.subtotal),
      total: Number(o.total),
      commission: Number(o.commission),
      vetPointsUsed: Number(o.vetPointsUsed),
      vetPointsEarned: Number(o.vetPointsEarned),
      items: o.items?.map((it: any) => ({ ...it, price: Number(it.price) })),
    };
  }
}

// Цена за единицу с учётом объёмных скидок оффера (price breaks).
export function unitPriceForQty(offer: any, qty: number): number {
  const base = Number(offer.price);
  const breaks = Array.isArray(offer.priceBreaks) ? offer.priceBreaks : [];
  let price = base;
  for (const b of [...breaks].sort((a, b) => Number(a.minQty) - Number(b.minQty))) {
    if (b && qty >= Number(b.minQty)) price = Number(b.price);
  }
  return price;
}
