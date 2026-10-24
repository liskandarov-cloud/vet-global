import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { recalcProductAggregates } from '../offers/product-aggregates';
import { parseCommerceML, PriceItem, priceUpdateFrom } from './price-item';

export type { PriceItem } from './price-item';

@Injectable()
export class SyncService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Seller integration key ──
  async generateKey(sellerId: string) {
    const key = `vg_sk_${randomBytes(24).toString('hex')}`;
    await this.prisma.user.update({ where: { id: sellerId }, data: { syncApiKey: key } });
    return { syncApiKey: key };
  }

  async getKey(sellerId: string) {
    const u = await this.prisma.user.findUnique({ where: { id: sellerId } });
    return { syncApiKey: u?.syncApiKey ?? null };
  }

  private async resolveSeller(key?: string) {
    if (!key) throw new UnauthorizedException('X-Sync-Key header required');
    const seller = await this.prisma.user.findUnique({ where: { syncApiKey: key } });
    if (!seller || seller.role !== 'SELLER') throw new UnauthorizedException('Invalid sync key');
    // Блокировка закрывает вход по паролю — ключ интеграции тоже.
    if (seller.isBanned) throw new UnauthorizedException('Account is banned');
    return seller;
  }

  // Применение ценового фида продавца, найденного по ключу.
  //
  // Цена и наличие на витрине и в заказе берутся из предложения продавца
  // (Offer), а не из карточки. Раньше фид писал только в карточку: продавец
  // менял цены в 1С, получал «updated», а покупатели платили по-старому. Теперь
  // обновляется предложение — то же, что пишет импорт прайса, — а своя карточка
  // по-прежнему, потому что её остаток ограничивает заказ.
  //
  // Код 1С ищется и в предложении, и в собственной карточке: строки прайса
  // часто прикрепляются к чужой карточке того же товара, и тогда код живёт
  // только в предложении.
  async applyPrices(key: string | undefined, items: PriceItem[]) {
    const seller = await this.resolveSeller(key);
    if (!Array.isArray(items)) throw new BadRequestException('items должен быть массивом');
    let updated = 0;
    const notFound: string[] = [];
    const rejected: { externalId: string; reason: string }[] = [];
    const touchedProducts = new Set<string>();

    for (const it of items) {
      const externalId = String(it?.externalId ?? '').trim();
      if (!externalId) continue;

      const parsed = priceUpdateFrom(it);
      if ('error' in parsed) {
        rejected.push({ externalId, reason: parsed.error });
        continue;
      }
      const data = parsed.update;
      if (Object.keys(data).length === 0) continue;

      const offers = await this.prisma.offer.findMany({
        where: {
          sellerId: seller.id,
          OR: [{ externalId }, { product: { sellerId: seller.id, externalId } }],
        },
        select: { id: true, productId: true },
      });
      if (offers.length) {
        await this.prisma.offer.updateMany({ where: { id: { in: offers.map((o) => o.id) } }, data });
        for (const o of offers) touchedProducts.add(o.productId);
      }

      const own = await this.prisma.product.updateMany({
        where: { sellerId: seller.id, externalId },
        data,
      });

      if (offers.length || own.count > 0) updated++;
      else notFound.push(externalId);
    }

    // Цена «от» и минимальный заказ на карточке — из предложений.
    for (const productId of touchedProducts) await recalcProductAggregates(this.prisma, productId);

    return { seller: seller.company ?? seller.id, received: items.length, updated, notFound, rejected };
  }

  parseCommerceML(xml: string): PriceItem[] {
    return parseCommerceML(xml);
  }
}
