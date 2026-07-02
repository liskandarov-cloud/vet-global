import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

export interface PriceItem {
  externalId: string;
  price?: number;
  inStock?: boolean;
  quantity?: number;
}

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
    return seller;
  }

  // Apply a price/stock feed for the seller resolved by the key.
  async applyPrices(key: string | undefined, items: PriceItem[]) {
    const seller = await this.resolveSeller(key);
    let updated = 0;
    const notFound: string[] = [];

    for (const it of items) {
      if (!it.externalId) continue;
      const data: any = {};
      if (typeof it.price === 'number') data.price = it.price;
      if (typeof it.quantity === 'number') data.inStock = it.quantity > 0;
      else if (typeof it.inStock === 'boolean') data.inStock = it.inStock;
      if (Object.keys(data).length === 0) continue;

      const res = await this.prisma.product.updateMany({
        where: { sellerId: seller.id, externalId: it.externalId },
        data,
      });
      if (res.count > 0) updated += res.count;
      else notFound.push(it.externalId);
    }

    return { seller: seller.company ?? seller.id, received: items.length, updated, notFound };
  }

  // Minimal CommerceML (1C) offers parser: <Предложение> → Ид / ЦенаЗаЕдиницу / Количество.
  parseCommerceML(xml: string): PriceItem[] {
    const items: PriceItem[] = [];
    const offers = xml.match(/<Предложение>[\s\S]*?<\/Предложение>/g) ?? [];
    for (const o of offers) {
      const id = /<Ид>([^<]+)<\/Ид>/.exec(o)?.[1]?.trim();
      if (!id) continue;
      const price = /<ЦенаЗаЕдиницу>([^<]+)<\/ЦенаЗаЕдиницу>/.exec(o)?.[1]?.trim();
      const qty = /<Количество>([^<]+)<\/Количество>/.exec(o)?.[1]?.trim();
      items.push({
        externalId: id,
        price: price ? Number(price) : undefined,
        quantity: qty ? Number(qty) : undefined,
      });
    }
    return items;
  }
}
