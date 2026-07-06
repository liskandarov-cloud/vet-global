import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { CreateSubscriptionDto, UpdateSubscriptionDto } from './dto/subscription.dto';
import { AuthUser } from '../common/decorators/current-user.decorator';

const DAY = 86_400_000;

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
  ) {}

  async create(dto: CreateSubscriptionDto, user: AuthUser) {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException('Товар не найден');
    const intervalDays = dto.intervalDays ?? 30;
    return this.prisma.subscription.create({
      data: {
        buyerId: user.id,
        productId: dto.productId,
        offerId: dto.offerId ?? null,
        quantity: dto.quantity ?? 1,
        intervalDays,
        nextRunAt: new Date(Date.now() + intervalDays * DAY),
      },
    });
  }

  async listMine(user: AuthUser) {
    const subs = await this.prisma.subscription.findMany({
      where: { buyerId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { product: { select: { id: true, name: true, images: true } } },
    });
    return subs;
  }

  async update(id: string, dto: UpdateSubscriptionDto, user: AuthUser) {
    const sub = await this.getOwned(id, user);
    return this.prisma.subscription.update({
      where: { id: sub.id },
      data: {
        quantity: dto.quantity ?? sub.quantity,
        intervalDays: dto.intervalDays ?? sub.intervalDays,
        active: dto.active ?? sub.active,
      },
    });
  }

  async remove(id: string, user: AuthUser) {
    const sub = await this.getOwned(id, user);
    await this.prisma.subscription.delete({ where: { id: sub.id } });
    return { ok: true };
  }

  // «Заказать сейчас» — сгенерировать заказ и сдвинуть следующую дату.
  async runNow(id: string, user: AuthUser) {
    const sub = await this.getOwned(id, user);
    const order = await this.generateOrder(sub.id);
    return { orderId: order?.id ?? null };
  }

  // Обработка всех подписок, у которых наступил срок (для планировщика/cron).
  async runDue() {
    const due = await this.prisma.subscription.findMany({
      where: { active: true, nextRunAt: { lte: new Date() } },
      take: 200,
    });
    let processed = 0;
    for (const sub of due) {
      try {
        await this.generateOrder(sub.id);
        processed++;
      } catch (e: any) {
        this.logger.warn(`Подписка ${sub.id}: ${e?.message ?? e}`);
      }
    }
    return { processed, checked: due.length };
  }

  // Создаёт заказ по подписке (актуальная цена берётся из оффера) и сдвигает nextRunAt.
  private async generateOrder(subId: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { id: subId } });
    if (!sub) return null;
    const buyer = await this.prisma.user.findUnique({ where: { id: sub.buyerId } });
    if (!buyer) return null;

    const order = await this.orders.create(
      {
        items: [{ productId: sub.productId, offerId: sub.offerId ?? undefined, quantity: sub.quantity }],
        buyerName: buyer.fullName,
        buyerPhone: buyer.phone,
        buyerCompany: buyer.company ?? undefined,
      },
      { id: buyer.id, email: buyer.email, role: buyer.role as UserRole } as AuthUser,
    );

    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: {
        lastOrderId: order.id,
        nextRunAt: new Date(Date.now() + sub.intervalDays * DAY),
      },
    });
    return order;
  }

  private async getOwned(id: string, user: AuthUser) {
    const sub = await this.prisma.subscription.findUnique({ where: { id } });
    if (!sub) throw new NotFoundException('Подписка не найдена');
    if (sub.buyerId !== user.id && user.role !== UserRole.ADMIN)
      throw new ForbiddenException('Нет доступа');
    return sub;
  }
}
