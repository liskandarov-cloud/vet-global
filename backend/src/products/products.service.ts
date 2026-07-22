import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, ProductQueryDto, UpdateProductDto } from './dto/product.dto';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { serializeOffer } from '../common/pricing';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: ProductQueryDto) {
    const where: Prisma.ProductWhereInput = {};

    if (q.category) where.category = { slug: q.category };
    if (q.manufacturer) where.manufacturer = { equals: q.manufacturer, mode: 'insensitive' };
    if (q.activeSubstance)
      where.activeSubstance = { contains: q.activeSubstance, mode: 'insensitive' };
    if (q.form) where.form = { equals: q.form, mode: 'insensitive' };
    if (q.animalType) where.animalType = q.animalType;
    if (q.sellerId) where.sellerId = q.sellerId;
    if (typeof q.inStock === 'boolean') where.inStock = q.inStock;
    if (typeof q.isPromotion === 'boolean') where.isPromotion = q.isPromotion;
    if (q.priceMin != null || q.priceMax != null) {
      where.price = {};
      if (q.priceMin != null) (where.price as any).gte = q.priceMin;
      if (q.priceMax != null) (where.price as any).lte = q.priceMax;
    }
    if (q.search) {
      where.OR = [
        { name: { contains: q.search, mode: 'insensitive' } },
        { description: { contains: q.search, mode: 'insensitive' } },
        { activeSubstance: { contains: q.search, mode: 'insensitive' } },
        { manufacturer: { contains: q.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      q.sort === 'price_asc'
        ? { price: 'asc' }
        : q.sort === 'price_desc'
          ? { price: 'desc' }
          : q.sort === 'rating'
            ? { rating: 'desc' }
            : { createdAt: 'desc' };

    const skip = q.skip ?? 0;
    const take = q.limit ?? 20;

    const [total, products] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          category: { select: { name: true, nameUz: true, slug: true } },
          seller: { select: { id: true, company: true, isVerified: true, rating: true } },
        },
      }),
    ]);

    return { total, skip, limit: take, products: products.map((p) => this.serialize(p)) };
  }

  async getOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { name: true, nameUz: true, slug: true } },
        seller: {
          select: { id: true, company: true, fullName: true, isVerified: true, rating: true, createdAt: true },
        },
        offers: {
          where: { isActive: true },
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
        },
      },
    });
    if (!product) throw new NotFoundException('Product not found');

    // «Аналоги» — товары той же категории от других записей.
    const related = await this.prisma.product.findMany({
      where: { categoryId: product.categoryId, id: { not: id } },
      take: 4,
      orderBy: { rating: 'desc' },
      include: { seller: { select: { id: true, company: true, isVerified: true } } },
    });

    return { ...this.serialize(product), related: related.map((r) => this.serialize(r)) };
  }

  async create(dto: CreateProductDto, user: AuthUser) {
    await this.assertCategory(dto.categoryId);
    const product = await this.prisma.product.create({
      data: { ...dto, sellerId: user.id },
    });
    await this.upsertBrand(product.manufacturer);
    return this.serialize(product);
  }

  // Бренд-производитель заводится автоматически из поля manufacturer товара,
  // чтобы страница «Бренды» наполнялась без ручного администрирования.
  async upsertBrand(manufacturer?: string | null) {
    const name = manufacturer?.trim();
    if (!name) return;
    const slug =
      name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') ||
      `brand-${name.length}`;
    const existing = await this.prisma.brand.findUnique({ where: { name } });
    if (existing) return;
    // На случай коллизии слага добавляем суффикс.
    const slugTaken = await this.prisma.brand.findUnique({ where: { slug } });
    await this.prisma.brand
      .create({
        data: {
          name,
          slug: slugTaken ? `${slug}-${Date.now().toString(36).slice(-4)}` : slug,
          description: `${name} — производитель ветеринарной продукции.`,
        },
      })
      .catch(() => undefined);
  }

  async update(id: string, dto: UpdateProductDto, user: AuthUser) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Product not found');
    this.assertOwnership(existing.sellerId, user);
    await this.assertCategory(dto.categoryId);
    const product = await this.prisma.product.update({ where: { id }, data: dto });
    await this.upsertBrand(product.manufacturer);
    return this.serialize(product);
  }

  async remove(id: string, user: AuthUser) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Product not found');
    this.assertOwnership(existing.sellerId, user);
    await this.prisma.product.delete({ where: { id } });
    return { message: 'Product deleted' };
  }

  // Facet values for building filter UIs.
  async facets() {
    const [manufacturers, forms] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where: { manufacturer: { not: null } },
        distinct: ['manufacturer'],
        select: { manufacturer: true },
      }),
      this.prisma.product.findMany({
        where: { form: { not: null } },
        distinct: ['form'],
        select: { form: true },
      }),
    ]);
    return {
      manufacturers: manufacturers.map((m) => m.manufacturer).filter(Boolean),
      forms: forms.map((f) => f.form).filter(Boolean),
      animalTypes: ['POULTRY', 'CATTLE', 'SMALL_RUMINANTS', 'HORSES', 'PETS', 'OTHER'],
    };
  }

  private assertOwnership(sellerId: string, user: AuthUser) {
    if (sellerId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Not authorized for this product');
    }
  }

  private async assertCategory(categoryId: string) {
    const cat = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!cat) throw new NotFoundException('Category not found');
  }

  private serialize(p: any) {
    return {
      ...p,
      price: Number(p.price),
      minPrice: p.minPrice != null ? Number(p.minPrice) : null,
      rating: Number(p.rating),
      ...(p.seller ? { seller: { ...p.seller, rating: Number(p.seller.rating ?? 0) } } : {}),
      ...(Array.isArray(p.offers) ? { offers: p.offers.map((o: any) => serializeOffer(o)) } : {}),
    };
  }
}
