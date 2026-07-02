import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsInt, IsString, Max, Min } from 'class-validator';
import { OrderStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

class CreateReviewDto {
  @IsString() productId: string;
  @IsInt() @Min(1) @Max(5) rating: number;
  @IsString() comment: string;
}

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query('productId') productId?: string, @Query('approved') approved = 'true') {
    const reviews = await this.prisma.review.findMany({
      where: { isApproved: approved !== 'false', ...(productId ? { productId } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return reviews;
  }

  // Admin moderation queue.
  @Get('pending')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  pending() {
    return this.prisma.review.findMany({ where: { isApproved: false }, orderBy: { createdAt: 'desc' } });
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUYER)
  async create(@Body() dto: CreateReviewDto, @CurrentUser() user: AuthUser) {
    // ТЗ 6.12 — review allowed only after a confirmed purchase of the product.
    const purchase = await this.prisma.order.findFirst({
      where: {
        buyerId: user.id,
        status: { in: [OrderStatus.CONFIRMED, OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.DELIVERED] },
        items: { some: { productId: dto.productId } },
      },
    });
    if (!purchase) {
      throw new ForbiddenException('Отзыв можно оставить только после подтверждённой покупки');
    }

    const existing = await this.prisma.review.findUnique({
      where: { productId_buyerId: { productId: dto.productId, buyerId: user.id } },
    });
    if (existing) throw new BadRequestException('Вы уже оставили отзыв на этот товар');

    return this.prisma.review.create({
      data: {
        productId: dto.productId,
        buyerId: user.id,
        buyerName: user.fullName,
        rating: dto.rating,
        comment: dto.comment,
      },
    });
  }

  @Patch(':id/approve')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async approve(@Param('id') id: string, @Body('isApproved') isApproved = true) {
    const review = await this.prisma.review.update({ where: { id }, data: { isApproved } });
    await this.recomputeRating(review.productId);
    return review;
  }

  // Recompute product & seller aggregate ratings from approved reviews.
  private async recomputeRating(productId: string) {
    const approved = await this.prisma.review.findMany({
      where: { productId, isApproved: true },
    });
    const avg = approved.length ? approved.reduce((s, r) => s + r.rating, 0) / approved.length : 0;
    await this.prisma.product.update({
      where: { id: productId },
      data: { rating: Math.round(avg * 10) / 10, reviewsCount: approved.length },
    });

    // Roll up to the seller's average rating across their products.
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (product) {
      const sellerProducts = await this.prisma.product.findMany({
        where: { sellerId: product.sellerId, reviewsCount: { gt: 0 } },
      });
      const sAvg = sellerProducts.length
        ? sellerProducts.reduce((s, p) => s + Number(p.rating), 0) / sellerProducts.length
        : 0;
      await this.prisma.user.update({
        where: { id: product.sellerId },
        data: { rating: Math.round(sAvg * 10) / 10 },
      });
    }
  }
}
