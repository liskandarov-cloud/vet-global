import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { PromotionsService } from '../promotions/promotions.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

class AddFavoriteDto {
  @IsString() productId: string;
}

@ApiTags('favorites')
@Controller('favorites')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly promotions: PromotionsService,
  ) {}

  // Product ids only — for quick UI toggle state.
  @Get('ids')
  async ids(@CurrentUser() user: AuthUser) {
    const rows = await this.prisma.favorite.findMany({
      where: { userId: user.id },
      select: { productId: true },
    });
    return rows.map((r) => r.productId);
  }

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    const favs = await this.prisma.favorite.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          include: { seller: { select: { id: true, company: true, isVerified: true } } },
        },
      },
    });
    const products = favs.map((f) => f.product).filter(Boolean) as any[];
    // Акция снижает цену, и в избранном она должна быть той же, что в каталоге:
    // иначе покупатель видит здесь цену выше той, что спишется при заказе.
    await this.promotions.annotate(products);
    return products.map((p: any) => ({
      ...p,
      price: Number(p.price),
      minPrice: p.minPrice != null ? Number(p.minPrice) : null,
      rating: Number(p.rating),
      promoPercent: Number(p.promoPercent ?? 0),
    }));
  }

  @Post()
  async add(@Body() dto: AddFavoriteDto, @CurrentUser() user: AuthUser) {
    await this.prisma.favorite.upsert({
      where: { userId_productId: { userId: user.id, productId: dto.productId } },
      update: {},
      create: { userId: user.id, productId: dto.productId },
    });
    return { ok: true };
  }

  @Delete(':productId')
  async remove(@Param('productId') productId: string, @CurrentUser() user: AuthUser) {
    await this.prisma.favorite.deleteMany({ where: { userId: user.id, productId } });
    return { ok: true };
  }
}
