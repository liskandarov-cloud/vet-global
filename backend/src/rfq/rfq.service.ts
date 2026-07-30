import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RfqStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRfqDto, QuoteDto } from './dto/rfq.dto';
import { AuthUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class RfqService {
  private readonly commissionPct: number;
  private readonly earnPct: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    // Те же ставки, что и у обычного заказа — сделка по тендеру ничем не отличается.
    this.commissionPct = Number(config.get('PLATFORM_COMMISSION_PERCENT') ?? 12);
    this.earnPct = Number(config.get('VETPOINTS_EARN_PERCENT') ?? 1);
  }

  async create(dto: CreateRfqDto, user: AuthUser) {
    return this.prisma.rfq.create({
      data: {
        buyerId: user.id,
        title: dto.title,
        note: dto.note ?? null,
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        items: {
          create: dto.items.map((i) => ({
            productId: i.productId ?? null,
            name: i.name,
            unit: i.unit ?? null,
            quantity: i.quantity,
          })),
        },
      },
      include: { items: true },
    });
  }

  // Все запросы платформы (админ): кто создал + число позиций и котировок.
  async listAll() {
    return this.prisma.rfq.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        _count: { select: { quotes: true } },
        buyer: { select: { id: true, fullName: true, company: true } },
      },
    });
  }

  // Запросы покупателя.
  async listMine(user: AuthUser) {
    const rfqs = await this.prisma.rfq.findMany({
      where: { buyerId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { items: true, _count: { select: { quotes: true } } },
    });
    return rfqs;
  }

  // Все запросы платформы для продавца + отметка, дал ли он котировку.
  // Показываем и закрытые/разыгранные: продавцу важно видеть историю тендеров,
  // а подать котировку он всё равно сможет только по открытым (canQuote).
  async listOpen(user: AuthUser) {
    const rfqs = await this.prisma.rfq.findMany({
      where: {},
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        buyer: { select: { company: true, fullName: true } },
        quotes: { where: { sellerId: user.id }, select: { id: true, totalPrice: true, isAwarded: true } },
      },
    });
    return rfqs.map((r) => ({
      ...r,
      myQuote: r.quotes[0] ? { ...r.quotes[0], totalPrice: Number(r.quotes[0].totalPrice) } : null,
      quotes: undefined,
    }));
  }

  async getOne(id: string, user: AuthUser) {
    const rfq = await this.prisma.rfq.findUnique({
      where: { id },
      include: {
        items: true,
        buyer: { select: { id: true, company: true, fullName: true, phone: true } },
        quotes: {
          orderBy: { totalPrice: 'asc' },
          include: {
            seller: { select: { id: true, company: true, isVerified: true, rating: true } },
            items: { include: { rfqItem: { select: { id: true, name: true, quantity: true, unit: true } } } },
          },
        },
      },
    });
    if (!rfq) throw new NotFoundException('Запрос не найден');

    const isBuyer = rfq.buyerId === user.id;
    const isAdmin = user.role === UserRole.ADMIN;
    // Продавец видит только свою котировку; покупатель/админ — все.
    const quotes = (isBuyer || isAdmin
      ? rfq.quotes
      : rfq.quotes.filter((q) => q.sellerId === user.id)
    ).map((q) => ({
      ...q,
      totalPrice: Number(q.totalPrice),
      seller: { ...q.seller, rating: Number(q.seller.rating) },
      items: q.items.map((qi) => ({
        rfqItemId: qi.rfqItemId,
        name: qi.rfqItem.name,
        quantity: qi.rfqItem.quantity,
        unit: qi.rfqItem.unit,
        unitPrice: Number(qi.unitPrice),
        lineTotal: Number(qi.unitPrice) * qi.rfqItem.quantity,
      })),
    }));

    // Сделка, заключённая по этому тендеру (если победитель уже выбран).
    const order = await this.prisma.order.findFirst({
      where: { rfqId: rfq.id },
      select: { id: true, status: true, total: true },
    });

    return {
      ...rfq,
      quotes,
      canQuote: user.role === UserRole.SELLER && rfq.status === RfqStatus.OPEN,
      order: order ? { ...order, total: Number(order.total) } : null,
    };
  }

  // Продавец подаёт/обновляет котировку.
  // Два режима: единая сумма (dto.totalPrice) или разбивка по позициям (dto.items) —
  // тогда итог считается на сервере как Σ(цена × количество из запроса).
  async quote(rfqId: string, dto: QuoteDto, user: AuthUser) {
    const rfq = await this.prisma.rfq.findUnique({ where: { id: rfqId }, include: { items: true } });
    if (!rfq) throw new NotFoundException('Запрос не найден');
    if (rfq.status !== RfqStatus.OPEN) throw new BadRequestException('Запрос закрыт');

    // Разбивка по позициям: валидируем, что все позиции запроса оценены и что
    // присланные rfqItemId действительно принадлежат этому тендеру.
    let breakdown: { rfqItemId: string; unitPrice: number }[] | null = null;
    let total: number;
    if (dto.items?.length) {
      const validIds = new Set(rfq.items.map((it) => it.id));
      const seen = new Set<string>();
      for (const line of dto.items) {
        if (!validIds.has(line.rfqItemId)) throw new BadRequestException('Позиция не найдена в запросе');
        if (seen.has(line.rfqItemId)) throw new BadRequestException('Позиция указана дважды');
        seen.add(line.rfqItemId);
      }
      if (seen.size !== rfq.items.length) {
        throw new BadRequestException('Укажите цену по каждой позиции запроса');
      }
      breakdown = dto.items.map((l) => ({ rfqItemId: l.rfqItemId, unitPrice: l.unitPrice }));
      const qtyById = new Map(rfq.items.map((it) => [it.id, it.quantity]));
      total = breakdown.reduce((s, l) => s + l.unitPrice * (qtyById.get(l.rfqItemId) ?? 0), 0);
      total = Math.round(total * 100) / 100;
    } else if (dto.totalPrice != null) {
      total = dto.totalPrice;
    } else {
      throw new BadRequestException('Укажите цену: общей суммой или по позициям');
    }

    return this.prisma.$transaction(async (tx) => {
      const q = await tx.rfqQuote.upsert({
        where: { rfqId_sellerId: { rfqId, sellerId: user.id } },
        create: { rfqId, sellerId: user.id, totalPrice: total, leadTimeDays: dto.leadTimeDays ?? null, note: dto.note ?? null },
        update: { totalPrice: total, leadTimeDays: dto.leadTimeDays ?? null, note: dto.note ?? null },
      });
      // Перезаписываем разбивку целиком: при обновлении котировки старые строки
      // могут не соответствовать новым ценам.
      await tx.rfqQuoteItem.deleteMany({ where: { quoteId: q.id } });
      if (breakdown) {
        await tx.rfqQuoteItem.createMany({
          data: breakdown.map((l) => ({ quoteId: q.id, rfqItemId: l.rfqItemId, unitPrice: l.unitPrice })),
        });
      }
      return q;
    });
  }

  // Покупатель выбирает победителя тендера.
  async award(rfqId: string, quoteId: string, user: AuthUser) {
    const rfq = await this.prisma.rfq.findUnique({
      where: { id: rfqId },
      include: { quotes: { include: { items: true } }, items: true },
    });
    if (!rfq) throw new NotFoundException('Запрос не найден');
    if (rfq.buyerId !== user.id && user.role !== UserRole.ADMIN)
      throw new ForbiddenException('Нет доступа');
    const quote = rfq.quotes.find((q) => q.id === quoteId);
    if (!quote) throw new NotFoundException('Котировка не найдена');
    if (rfq.status === RfqStatus.AWARDED) throw new BadRequestException('Победитель уже выбран');

    await this.prisma.$transaction([
      this.prisma.rfqQuote.updateMany({ where: { rfqId }, data: { isAwarded: false } }),
      this.prisma.rfqQuote.update({ where: { id: quoteId }, data: { isAwarded: true } }),
      this.prisma.rfq.update({ where: { id: rfqId }, data: { status: RfqStatus.AWARDED } }),
    ]);

    // Выбор победителя = заключение сделки: создаём обычный заказ, чтобы дальше
    // работали статусы, счёт, ЭДО и доставка — как при покупке из каталога.
    const order = await this.createOrderFromQuote(rfq, quote);
    const result = await this.getOne(rfqId, user);
    return { ...result, orderId: order.id };
  }

  // Заказ по выигравшей котировке.
  // Если продавец дал разбивку по позициям — заказ создаётся строка-в-строку
  // (каждая позиция запроса своей ценой). Иначе (единая сумма) — одной позицией:
  // дробить лумп-сумму значило бы выдумывать цены, которых продавец не называл.
  private async createOrderFromQuote(rfq: any, quote: any) {
    const buyer = await this.prisma.user.findUnique({ where: { id: rfq.buyerId } });
    const total = Number(quote.totalPrice);
    const commission = Math.round(((total * this.commissionPct) / 100) * 100) / 100;
    const vetPointsEarned = Math.round(((total * this.earnPct) / 100) * 100) / 100;
    const positions = rfq.items?.length ?? 0;

    // Разбивка по позициям, если она есть в котировке.
    const itemById = new Map((rfq.items ?? []).map((it: any) => [it.id, it]));
    const breakdown: any[] = quote.items ?? [];
    const lines = breakdown.length
      ? breakdown.map((qi: any) => {
          const it: any = itemById.get(qi.rfqItemId);
          return {
            productId: it?.productId ?? null,
            productName: it?.name ?? 'Позиция',
            sellerId: quote.sellerId,
            quantity: it?.quantity ?? 1,
            price: Number(qi.unitPrice),
          };
        })
      : [
          {
            productId: null,
            productName: `Тендер: ${rfq.title}${positions ? ` (${positions} поз.)` : ''}`,
            sellerId: quote.sellerId,
            quantity: 1,
            price: total,
          },
        ];

    return this.prisma.order.create({
      data: {
        buyerId: rfq.buyerId,
        buyerName: buyer?.fullName ?? 'Покупатель',
        buyerPhone: buyer?.phone ?? '',
        buyerCompany: buyer?.company ?? null,
        rfqId: rfq.id,
        subtotal: total,
        total,
        commission,
        vetPointsEarned,
        items: { create: lines },
      },
    });
  }

  // Удаление запроса: админ — как модерация (нарушение правил), покупатель —
  // свой собственный, пока по нему не заключена сделка.
  async remove(rfqId: string, user: AuthUser) {
    const rfq = await this.prisma.rfq.findUnique({ where: { id: rfqId } });
    if (!rfq) throw new NotFoundException('Запрос не найден');
    const isAdmin = user.role === UserRole.ADMIN;
    if (!isAdmin && rfq.buyerId !== user.id) throw new ForbiddenException('Нет доступа');

    const order = await this.prisma.order.findFirst({ where: { rfqId } });
    if (order && !isAdmin) {
      throw new BadRequestException('По запросу уже есть заказ — удалить нельзя');
    }
    await this.prisma.rfq.delete({ where: { id: rfqId } });
    return { ok: true };
  }

  async close(rfqId: string, user: AuthUser) {
    const rfq = await this.prisma.rfq.findUnique({ where: { id: rfqId } });
    if (!rfq) throw new NotFoundException('Запрос не найден');
    if (rfq.buyerId !== user.id && user.role !== UserRole.ADMIN)
      throw new ForbiddenException('Нет доступа');
    return this.prisma.rfq.update({ where: { id: rfqId }, data: { status: RfqStatus.CLOSED } });
  }
}
