import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { RfqStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRfqDto, QuoteDto } from './dto/rfq.dto';
import { AuthUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class RfqService {
  constructor(private readonly prisma: PrismaService) {}

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
            quantity: i.quantity,
          })),
        },
      },
      include: { items: true },
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

  // Открытые запросы для продавца + отметка, дал ли он котировку.
  async listOpen(user: AuthUser) {
    const rfqs = await this.prisma.rfq.findMany({
      where: { status: RfqStatus.OPEN },
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
          include: { seller: { select: { id: true, company: true, isVerified: true, rating: true } } },
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
    ).map((q) => ({ ...q, totalPrice: Number(q.totalPrice), seller: { ...q.seller, rating: Number(q.seller.rating) } }));

    return { ...rfq, quotes, canQuote: user.role === UserRole.SELLER && rfq.status === RfqStatus.OPEN };
  }

  // Продавец подаёт/обновляет котировку.
  async quote(rfqId: string, dto: QuoteDto, user: AuthUser) {
    const rfq = await this.prisma.rfq.findUnique({ where: { id: rfqId } });
    if (!rfq) throw new NotFoundException('Запрос не найден');
    if (rfq.status !== RfqStatus.OPEN) throw new BadRequestException('Запрос закрыт');

    return this.prisma.rfqQuote.upsert({
      where: { rfqId_sellerId: { rfqId, sellerId: user.id } },
      create: {
        rfqId,
        sellerId: user.id,
        totalPrice: dto.totalPrice,
        leadTimeDays: dto.leadTimeDays ?? null,
        note: dto.note ?? null,
      },
      update: {
        totalPrice: dto.totalPrice,
        leadTimeDays: dto.leadTimeDays ?? null,
        note: dto.note ?? null,
      },
    });
  }

  // Покупатель выбирает победителя тендера.
  async award(rfqId: string, quoteId: string, user: AuthUser) {
    const rfq = await this.prisma.rfq.findUnique({ where: { id: rfqId }, include: { quotes: true } });
    if (!rfq) throw new NotFoundException('Запрос не найден');
    if (rfq.buyerId !== user.id && user.role !== UserRole.ADMIN)
      throw new ForbiddenException('Нет доступа');
    const quote = rfq.quotes.find((q) => q.id === quoteId);
    if (!quote) throw new NotFoundException('Котировка не найдена');

    await this.prisma.$transaction([
      this.prisma.rfqQuote.updateMany({ where: { rfqId }, data: { isAwarded: false } }),
      this.prisma.rfqQuote.update({ where: { id: quoteId }, data: { isAwarded: true } }),
      this.prisma.rfq.update({ where: { id: rfqId }, data: { status: RfqStatus.AWARDED } }),
    ]);
    return this.getOne(rfqId, user);
  }

  async close(rfqId: string, user: AuthUser) {
    const rfq = await this.prisma.rfq.findUnique({ where: { id: rfqId } });
    if (!rfq) throw new NotFoundException('Запрос не найден');
    if (rfq.buyerId !== user.id && user.role !== UserRole.ADMIN)
      throw new ForbiddenException('Нет доступа');
    return this.prisma.rfq.update({ where: { id: rfqId }, data: { status: RfqStatus.CLOSED } });
  }
}
