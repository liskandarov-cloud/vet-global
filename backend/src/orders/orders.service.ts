import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus, UserRole, VetPointsType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/order.dto';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { PdfService } from '../documents/pdf.service';

@Injectable()
export class OrdersService {
  private readonly commissionPct: number;
  private readonly earnPct: number;
  private readonly maxSpendPct: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly pdf: PdfService,
  ) {
    this.commissionPct = Number(config.get('PLATFORM_COMMISSION_PERCENT') ?? 12);
    this.earnPct = Number(config.get('VETPOINTS_EARN_PERCENT') ?? 1);
    this.maxSpendPct = Number(config.get('VETPOINTS_MAX_SPEND_PERCENT') ?? 10);
  }

  async create(dto: CreateOrderDto, user?: AuthUser) {
    // Resolve products from DB (never trust client-supplied prices).
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({ where: { id: { in: productIds } } });
    if (products.length !== new Set(productIds).size) {
      throw new BadRequestException('Some products were not found');
    }

    const items = dto.items.map((i) => {
      const p = products.find((x) => x.id === i.productId)!;
      if (i.quantity < p.minOrder) {
        throw new BadRequestException(
          `Минимальный заказ для «${p.name}» — ${p.minOrder} шт.`,
        );
      }
      return {
        productId: p.id,
        productName: p.name,
        sellerId: p.sellerId,
        quantity: i.quantity,
        price: Number(p.price),
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
          items: { create: items },
        },
        include: { items: true },
      });

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

    // TODO(phase-2): notify seller + admin via Telegram/Email (SRS 4.2).
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
      include: { items: true, invoice: true },
      take: 200,
    });
    return orders.map((o) => this.serialize(o));
  }

  async getOne(id: string, user: AuthUser) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true, invoice: true },
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

    return this.getOne(id, user);
  }

  // Generates (and records) the invoice PDF for a confirmed order.
  async invoicePdf(id: string, user: AuthUser): Promise<{ buffer: Buffer; number: string }> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true, invoice: true },
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
