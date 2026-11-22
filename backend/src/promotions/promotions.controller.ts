import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AlertsService } from '../alerts/alerts.service';
import { tt } from '../alerts/text';
import { canSell } from '../common/visibility';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

class PromotionDto {
  @IsString() title: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() productId?: string;
  @IsOptional() @IsInt() @Min(0) @Max(100) discountPercent?: number;
  // Начало акции: без него акцию нельзя было назначить на будущее — поле в базе
  // есть, но задать его было нечем, и любая акция начиналась немедленно.
  @IsOptional() @IsString() startsAt?: string;
  @IsOptional() @IsString() endsAt?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

// Правка акции: все поля необязательны.
//
// Раньше правка принимала тот же DTO, что создание, с обязательным названием —
// и выключить акцию одним полем было нельзя: запрос падал на «title must be a
// string». Продавец мог снять акцию только удалением, то есть потеряв её
// историю, либо переслав название вместе с переключателем.
class UpdatePromotionDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() productId?: string;
  @IsOptional() @IsInt() @Min(0) @Max(100) discountPercent?: number;
  @IsOptional() @IsString() startsAt?: string;
  @IsOptional() @IsString() endsAt?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

@ApiTags('promotions')
@Controller('promotions')
export class PromotionsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alerts: AlertsService,
  ) {}

  // Публичный список акций — для страницы «Акции» и главной.
  //
  // Начало акции учитывается наравне с окончанием: раньше фильтр смотрел только
  // на endsAt, и акция, назначенная на следующую неделю, показывалась сразу —
  // покупатель видел скидку, которая ещё не началась.
  @Get()
  list() {
    const now = new Date();
    return this.prisma.promotion.findMany({
      where: {
        isActive: true,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gte: now } }],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        seller: { select: { id: true, company: true, isVerified: true } },
        product: { select: { id: true, name: true, price: true, images: true } },
      },
    });
  }

  @Get('mine')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  mine(@CurrentUser() user: AuthUser) {
    return this.prisma.promotion.findMany({ where: { sellerId: user.id }, orderBy: { createdAt: 'desc' } });
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  async create(@Body() dto: PromotionDto, @CurrentUser() user: AuthUser) {
    const promo = await this.prisma.promotion.create({
      data: {
        sellerId: user.id,
        title: dto.title,
        description: dto.description,
        productId: dto.productId,
        discountPercent: dto.discountPercent ?? 0,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : new Date(),
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        isActive: dto.isActive ?? true,
      },
      include: {
        product: { select: { name: true, nameUz: true, images: true } },
        seller: { select: { company: true, fullName: true, isVerified: true, isBanned: true } },
      },
    });
    // В канал — только то, что покупатель увидит на сайте.
    if (promo.isActive && promo.discountPercent > 0 && canSell(promo.seller)) {
      const d = promo.discountPercent;
      const until = promo.endsAt ? promo.endsAt.toLocaleDateString('ru-RU') : null;
      const who = promo.seller.company || promo.seller.fullName;
      void this.alerts
        .postToChannel({
          title: tt(`🔥 Акция: ${promo.title}`, `🔥 Aksiya: ${promo.title}`),
          body: promo.product
            ? tt(
                `«${promo.product.name}» — скидка ${d}%${until ? ` до ${until}` : ''}`,
                `«${promo.product.nameUz || promo.product.name}» — ${d}% chegirma${until ? `, ${until} gacha` : ''}`,
              )
            : tt(
                `Скидка ${d}% на весь ассортимент ${who}${until ? ` до ${until}` : ''}`,
                `${who}: barcha mahsulotlarga ${d}% chegirma${until ? `, ${until} gacha` : ''}`,
              ),
          url: promo.productId ? `/products/${promo.productId}` : '/promotions',
          image: promo.product?.images?.[0],
        })
        .catch(() => undefined);
    }
    const { product: _p, seller: _s, ...plain } = promo;
    return plain;
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  async update(@Param('id') id: string, @Body() dto: UpdatePromotionDto, @CurrentUser() user: AuthUser) {
    await this.assertOwner(id, user);
    return this.prisma.promotion.update({
      where: { id },
      data: {
        ...dto,
        // Даты приходят строками и должны быть приведены обеими: тело
        // разворачивается целиком, и строка в поле даты валит запрос Prisma.
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      },
    });
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    await this.assertOwner(id, user);
    await this.prisma.promotion.delete({ where: { id } });
    return { message: 'Deleted' };
  }

  private async assertOwner(id: string, user: AuthUser) {
    const promo = await this.prisma.promotion.findUnique({ where: { id } });
    if (!promo) throw new NotFoundException('Promotion not found');
    if (promo.sellerId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Not authorized');
    }
  }
}
