import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContractPriceDto } from './dto/contract-price.dto';
import { AuthUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class ContractPricesService {
  constructor(private readonly prisma: PrismaService) {}

  // Продавец назначает персональную цену покупателю на свой оффер.
  async create(dto: CreateContractPriceDto, user: AuthUser) {
    const offer = await this.prisma.offer.findUnique({ where: { id: dto.offerId } });
    if (!offer) throw new NotFoundException('Оффер не найден');
    if (offer.sellerId !== user.id && user.role !== UserRole.ADMIN)
      throw new ForbiddenException('Это не ваш оффер');

    const buyer = await this.prisma.user.findUnique({ where: { email: dto.buyerEmail } });
    if (!buyer) throw new NotFoundException('Покупатель с таким email не зарегистрирован');

    const data = {
      offerId: dto.offerId,
      sellerId: offer.sellerId,
      buyerId: buyer.id,
      price: dto.price,
      note: dto.note ?? null,
      validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
    };
    return this.prisma.contractPrice.upsert({
      where: { offerId_buyerId: { offerId: dto.offerId, buyerId: buyer.id } },
      create: data,
      update: { price: data.price, note: data.note, validUntil: data.validUntil },
    });
  }

  // Договорные цены продавца.
  async listSeller(user: AuthUser) {
    const rows = await this.prisma.contractPrice.findMany({
      where: { sellerId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        offer: { include: { product: { select: { id: true, name: true } } } },
        buyer: { select: { id: true, fullName: true, company: true, email: true } },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      offerId: r.offerId,
      price: Number(r.price),
      note: r.note,
      validUntil: r.validUntil,
      productName: r.offer.product.name,
      buyer: r.buyer,
    }));
  }

  // Договорные цены текущего покупателя (для показа на карточке).
  async listMy(user: AuthUser, productId?: string) {
    const rows = await this.prisma.contractPrice.findMany({
      where: {
        buyerId: user.id,
        OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
        ...(productId ? { offer: { productId } } : {}),
      },
      include: { offer: { select: { productId: true } } },
    });
    return rows.map((r) => ({
      offerId: r.offerId,
      productId: r.offer.productId,
      price: Number(r.price),
      validUntil: r.validUntil,
    }));
  }

  async remove(id: string, user: AuthUser) {
    const row = await this.prisma.contractPrice.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Запись не найдена');
    if (row.sellerId !== user.id && user.role !== UserRole.ADMIN)
      throw new ForbiddenException('Нет доступа');
    await this.prisma.contractPrice.delete({ where: { id } });
    return { ok: true };
  }
}
