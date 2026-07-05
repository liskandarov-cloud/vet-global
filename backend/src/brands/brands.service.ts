import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: PrismaService) {}

  // Список брендов: спонсируемые — первыми (retail media).
  async list() {
    const brands = await this.prisma.brand.findMany({
      orderBy: [{ isSponsored: 'desc' }, { sponsorRank: 'desc' }, { name: 'asc' }],
    });
    // Кол-во товаров по названию производителя.
    const counts = await this.prisma.product.groupBy({
      by: ['manufacturer'],
      _count: { _all: true },
    });
    const countMap = new Map(counts.map((c) => [c.manufacturer, c._count._all]));
    return brands.map((b) => ({ ...b, productCount: countMap.get(b.name) ?? 0 }));
  }

  async getBySlug(slug: string) {
    const brand = await this.prisma.brand.findUnique({ where: { slug } });
    if (!brand) throw new NotFoundException('Бренд не найден');
    const products = await this.prisma.product.findMany({
      where: { manufacturer: brand.name },
      orderBy: { rating: 'desc' },
      take: 60,
      include: { seller: { select: { id: true, company: true, isVerified: true } } },
    });
    return {
      ...brand,
      products: products.map((p) => ({
        ...p,
        price: Number(p.price),
        minPrice: p.minPrice != null ? Number(p.minPrice) : null,
        rating: Number(p.rating),
      })),
    };
  }

  // Админ: включить/настроить платное продвижение.
  async setSponsor(id: string, isSponsored: boolean, sponsorRank?: number) {
    const brand = await this.prisma.brand.findUnique({ where: { id } });
    if (!brand) throw new NotFoundException('Бренд не найден');
    return this.prisma.brand.update({
      where: { id },
      data: { isSponsored, sponsorRank: sponsorRank ?? brand.sponsorRank },
    });
  }
}
