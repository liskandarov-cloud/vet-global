import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOfferDto, UpdateOfferDto } from './dto/offer.dto';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { serializeOffer } from '../common/pricing';
import { publicOffer } from '../common/visibility';
import { recalcProductAggregates, syncProductFromOwnerOffer } from './product-aggregates';
import { StorageService } from '../storage/storage.service';
import { offerDocsChanged } from '../common/reverify';

@Injectable()
export class OffersService {
  private readonly logger = new Logger(OffersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  // Сертификат — только файл, загруженный через платформу (как лицензии
  // продавца): его открывает администратор при проверке, и произвольная
  // ссылка здесь — ссылка, по которой он перейдёт сам.
  private assertCertificates(list?: string[] | null, kept?: string[] | null) {
    this.storage.assertOwnUrls(list, kept, 'Сертификат загружается файлом через платформу, а не ссылкой');
  }

  // Публичный список предложений по товару — отсортирован по цене (сравнение цен).
  async listForProduct(productId: string) {
    const offers = await this.prisma.offer.findMany({
      where: { productId, ...publicOffer() },
      orderBy: { price: 'asc' },
      include: {
        seller: {
          select: {
            id: true,
            company: true,
            fullName: true,
            isVerified: true,
            isDemo: true,
            rating: true,
            reviewsCount: true,
            logoUrl: true,
          },
        },
      },
    });
    // Сортируем по цене единицы заказа: при разной фасовке порядок по price из БД неверен.
    return offers.map(serializeOffer).sort((a, b) => a.packPrice - b.packPrice);
  }

  // Предложения текущего продавца (кабинет).
  async listMine(user: AuthUser) {
    const offers = await this.prisma.offer.findMany({
      where: { sellerId: user.id },
      orderBy: { updatedAt: 'desc' },
      include: { product: { select: { id: true, name: true, images: true } } },
    });
    return offers.map(serializeOffer);
  }

  async create(dto: CreateOfferDto, user: AuthUser) {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException('Товар не найден');

    const existing = await this.prisma.offer.findUnique({
      where: { productId_sellerId: { productId: dto.productId, sellerId: user.id } },
      select: { certificates: true, regNumber: true },
    });
    this.assertCertificates(dto.certificates, existing?.certificates);
    const data = this.toData(dto);
    if (existing && offerDocsChanged(existing, dto)) data.certVerified = false;
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

    await syncProductFromOwnerOffer(this.prisma, offer);
    await this.recalcProduct(dto.productId);
    return serializeOffer(offer);
  }

  async update(id: string, dto: UpdateOfferDto, user: AuthUser) {
    const offer = await this.prisma.offer.findUnique({ where: { id } });
    if (!offer) throw new NotFoundException('Оффер не найден');
    if (offer.sellerId !== user.id && user.role !== UserRole.ADMIN)
      throw new ForbiddenException('Нет доступа к этому офферу');

    this.assertCertificates(dto.certificates, offer.certificates);
    const data = this.toData(dto);
    // Проверка относилась к прежним документам — после замены нужна новая.
    if (offerDocsChanged(offer, dto)) data.certVerified = false;
    const updated = await this.prisma.offer.update({
      where: { id },
      data: data as Prisma.OfferUncheckedUpdateInput,
    });
    await syncProductFromOwnerOffer(this.prisma, updated);
    await this.recalcProduct(offer.productId);
    return serializeOffer(updated);
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

  // Очередь верификации для админки: офферы с документами (сертификаты/рег. номер),
  // ещё не подтверждённые платформой. Анти-фальсификат.
  async verificationQueue() {
    const offers = await this.prisma.offer.findMany({
      where: {
        certVerified: false,
        isActive: true,
        OR: [{ certificates: { isEmpty: false } }, { regNumber: { not: null } }],
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        product: { select: { id: true, name: true, manufacturer: true } },
        seller: { select: { id: true, company: true, fullName: true } },
      },
    });
    return offers.map(serializeOffer);
  }

  // Верификация сертификатов/партии платформой (админ). Анти-фальсификат.
  async setVerified(id: string, verified: boolean) {
    const offer = await this.prisma.offer.findUnique({ where: { id } });
    if (!offer) throw new NotFoundException('Оффер не найден');
    return this.prisma.offer.update({
      where: { id },
      data: { certVerified: verified },
    });
  }

  // Срок годности истёк — предложение пропадает с витрины само (publicOffer),
  // но цена «от» и число продавцов у товара хранятся денормализованно. Без
  // пересчёта каталог показывал бы цену партии, которую уже не купить.
  // Окно в неделю — на случай, если ночной запуск пропущен (сервер спал).
  @Cron('10 0 * * *', { name: 'expired-offers-recalc', timeZone: 'Asia/Tashkent' })
  async recalcExpired(now: Date = new Date()) {
    const rows = await this.prisma.offer.findMany({
      where: { expiryDate: { lte: now, gt: new Date(now.getTime() - 7 * 86_400_000) } },
      distinct: ['productId'],
      select: { productId: true },
    });
    for (const { productId } of rows) await this.recalcProduct(productId);
    if (rows.length) this.logger.log(`пересчитаны товары с истёкшими партиями: ${rows.length}`);
    return { products: rows.length };
  }

  // Пересчёт агрегатов товара — см. product-aggregates.ts.
  async recalcProduct(productId: string) {
    await recalcProductAggregates(this.prisma, productId);
  }

  // Возвращает частичный набор полей (годится и для create, и для update).
  private toData(dto: CreateOfferDto | UpdateOfferDto): Record<string, unknown> {
    const d: Record<string, unknown> = {};
    if (dto.price != null) d.price = dto.price;
    if (dto.inStock != null) d.inStock = dto.inStock;
    if (dto.stockQty !== undefined) d.stockQty = dto.stockQty;
    if (dto.minOrder != null) d.minOrder = dto.minOrder;
    if (dto.leadTimeDays !== undefined) d.leadTimeDays = dto.leadTimeDays;
    if (dto.priceUnit !== undefined) d.priceUnit = dto.priceUnit;
    if (dto.priceUnitQty != null) d.priceUnitQty = dto.priceUnitQty;
    if (dto.packSize != null) d.packSize = dto.packSize;
    if (dto.packUnit !== undefined) d.packUnit = dto.packUnit;
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
