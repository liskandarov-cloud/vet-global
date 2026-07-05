import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOfferDto, UpdateOfferDto } from './dto/offer.dto';
import { AuthUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class OffersService {
  constructor(private readonly prisma: PrismaService) {}

  // Публичный список предложений по товару — отсортирован по цене (сравнение цен).
  async listForProduct(productId: string) {
    const offers = await this.prisma.offer.findMany({
      where: { productId, isActive: true },
      orderBy: { price: 'asc' },
      include: {
        seller: {
          select: {
            id: true,
            company: true,
            fullName: true,
            isVerified: true,
            rating: true,
            reviewsCount: true,
            logoUrl: true,
          },
        },
      },
    });
    return offers;
  }

  // Предложения текущего продавца (кабинет).
  listMine(user: AuthUser) {
    return this.prisma.offer.findMany({
      where: { sellerId: user.id },
      orderBy: { updatedAt: 'desc' },
      include: { product: { select: { id: true, name: true, images: true } } },
    });
  }

  async create(dto: CreateOfferDto, user: AuthUser) {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException('Товар не найден');

    const data = this.toData(dto);
    const offer = await this.prisma.offer.upsert({
      where: { productId_sellerId: { productId: dto.productId, sellerId: user.id } },
      create: {
        productId: dto.productId,
        sellerId: user.id,
        price: dto.price,
        ...data,
      } as Prisma.OfferUncheckedCreateInput,
      update: data as Prisma.OfferUncheckedUpdateInput,
    });

    await this.recalcProduct(dto.productId);
    return offer;
  }

  async update(id: string, dto: UpdateOfferDto, user: AuthUser) {
    const offer = await this.prisma.offer.findUnique({ where: { id } });
    if (!offer) throw new NotFoundException('Оффер не найден');
    if (offer.sellerId !== user.id && user.role !== UserRole.ADMIN)
      throw new ForbiddenException('Нет доступа к этому офферу');

    const updated = await this.prisma.offer.update({
      where: { id },
      data: this.toData(dto) as Prisma.OfferUncheckedUpdateInput,
    });
    await this.recalcProduct(offer.productId);
    return updated;
  }

  async remove(id: string, user: AuthUser) {
    const offer = await this.prisma.offer.findUnique({ where: { id } });
    if (!offer) throw new NotFoundException('Оффер не найден');
    if (offer.sellerId !== user.id && user.role !== UserRole.ADMIN)
      throw new ForbiddenException('Нет доступа к этому офферу');

    await this.prisma.offer.delete({ where: { id } });
    await this.recalcProduct(offer.productId);
    return { ok: true };
  }

  // Пересчёт денормализованных агрегатов товара (minPrice / offersCount).
  async recalcProduct(productId: string) {
    const agg = await this.prisma.offer.aggregate({
      where: { productId, isActive: true, inStock: true },
      _min: { price: true },
      _count: { _all: true },
    });
    await this.prisma.product.update({
      where: { id: productId },
      data: {
        minPrice: agg._min.price ?? null,
        offersCount: agg._count._all,
      },
    });
  }

  // Возвращает частичный набор полей (годится и для create, и для update).
  private toData(dto: CreateOfferDto | UpdateOfferDto): Record<string, unknown> {
    const d: Record<string, unknown> = {};
    if (dto.price != null) d.price = dto.price;
    if (dto.inStock != null) d.inStock = dto.inStock;
    if (dto.stockQty !== undefined) d.stockQty = dto.stockQty;
    if (dto.minOrder != null) d.minOrder = dto.minOrder;
    if (dto.leadTimeDays !== undefined) d.leadTimeDays = dto.leadTimeDays;
    if (dto.priceBreaks !== undefined)
      d.priceBreaks = (dto.priceBreaks as unknown as Prisma.InputJsonValue) ?? Prisma.JsonNull;
    if (dto.netTermDays !== undefined) d.netTermDays = dto.netTermDays;
    if (dto.batchNumber !== undefined) d.batchNumber = dto.batchNumber;
    if (dto.expiryDate !== undefined)
      d.expiryDate = dto.expiryDate ? new Date(dto.expiryDate) : null;
    if (dto.regNumber !== undefined) d.regNumber = dto.regNumber;
    if (dto.isRx != null) d.isRx = dto.isRx;
    if (dto.certificates !== undefined) d.certificates = dto.certificates;
    if (dto.externalId !== undefined) d.externalId = dto.externalId;
    return d;
  }
}
