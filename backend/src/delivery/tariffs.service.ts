import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DeliveryMethod, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { deliveryCostByTariff, type Tariff } from './tariff';

@Injectable()
export class TariffsService {
  constructor(private readonly prisma: PrismaService) {}

  private serialize(t: any) {
    return { ...t, cost: Number(t.cost), freeFrom: t.freeFrom == null ? null : Number(t.freeFrom) };
  }

  async listMine(user: AuthUser) {
    const rows = await this.prisma.deliveryTariff.findMany({
      where: { sellerId: user.id },
      orderBy: [{ method: 'asc' }, { city: 'asc' }],
    });
    return rows.map((t) => this.serialize(t));
  }

  async upsert(
    dto: { method: DeliveryMethod; city?: string; cost: number; freeFrom?: number; isActive?: boolean; note?: string },
    user: AuthUser,
  ) {
    // Отсутствие города и пробелы приводятся к пустой строке — тарифу по
    // умолчанию. Без приведения появились бы неотличимые строки.
    const city = dto.city?.trim() ?? '';
    const data = {
      cost: dto.cost,
      freeFrom: dto.freeFrom ?? null,
      isActive: dto.isActive ?? true,
      note: dto.note,
    };
    const row = await this.prisma.deliveryTariff.upsert({
      where: { sellerId_method_city: { sellerId: user.id, method: dto.method, city } },
      update: data,
      create: { sellerId: user.id, method: dto.method, city, ...data },
    });
    return this.serialize(row);
  }

  async remove(id: string, user: AuthUser) {
    const row = await this.prisma.deliveryTariff.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Тариф не найден');
    if (row.sellerId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Not authorized');
    }
    await this.prisma.deliveryTariff.delete({ where: { id } });
    return { ok: true };
  }

  // Стоимость доставки для набора позиций корзины.
  //
  // Продавцы определяются по офферам, а для позиций без оффера — по владельцу
  // товара: ровно так же, как это делает сборка заказа, иначе расчёт в корзине
  // расходился бы с итоговой суммой.
  async estimate(params: {
    offerIds: string[];
    productIds: string[];
    method: DeliveryMethod;
    city?: string;
    subtotal: number;
  }) {
    const sellerIds = new Set<string>();

    if (params.offerIds.length) {
      const offers = await this.prisma.offer.findMany({
        where: { id: { in: params.offerIds } },
        select: { sellerId: true },
      });
      offers.forEach((o) => sellerIds.add(o.sellerId));
    }
    if (params.productIds.length) {
      const products = await this.prisma.product.findMany({
        where: { id: { in: params.productIds } },
        select: { sellerId: true },
      });
      products.forEach((p) => sellerIds.add(p.sellerId));
    }

    if (!sellerIds.size) {
      return { total: 0, method: params.method, city: params.city ?? null, bySeller: [], unknown: [] };
    }

    const tariffs = await this.prisma.deliveryTariff.findMany({
      where: { sellerId: { in: [...sellerIds] }, isActive: true },
    });

    const bySeller: { sellerId: string; cost: number }[] = [];
    // Продавцы без подходящего тарифа: их доставку посчитать нельзя, и
    // покупателю честнее сказать об этом, чем показать заниженную сумму.
    const unknown: string[] = [];
    let total = 0;

    for (const sellerId of sellerIds) {
      const own: Tariff[] = tariffs
        .filter((t) => t.sellerId === sellerId)
        .map((t) => ({
          method: t.method,
          city: t.city,
          cost: Number(t.cost),
          freeFrom: t.freeFrom == null ? null : Number(t.freeFrom),
          isActive: t.isActive,
        }));

      const cost = deliveryCostByTariff(own, {
        method: params.method,
        city: params.city,
        orderSubtotal: params.subtotal,
      });

      if (cost == null) {
        unknown.push(sellerId);
        continue;
      }
      bySeller.push({ sellerId, cost });
      total += cost;
    }

    return { total, method: params.method, city: params.city ?? null, bySeller, unknown };
  }
}
