import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { OffersService } from './offers.service';
import { CreateOfferDto, UpdateOfferDto } from './dto/offer.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('offers')
@Controller()
export class OffersController {
  constructor(private readonly offers: OffersService) {}

  // Публичное сравнение цен по товару.
  @Get('products/:productId/offers')
  listForProduct(@Param('productId') productId: string) {
    return this.offers.listForProduct(productId);
  }

  @Get('offers/mine')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  listMine(@CurrentUser() user: AuthUser) {
    return this.offers.listMine(user);
  }

  @Post('offers')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  create(@Body() dto: CreateOfferDto, @CurrentUser() user: AuthUser) {
    return this.offers.create(dto, user);
  }

  @Put('offers/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateOfferDto, @CurrentUser() user: AuthUser) {
    return this.offers.update(id, dto, user);
  }

  @Delete('offers/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.offers.remove(id, user);
  }

  // Очередь верификации (админ): офферы с документами, ещё не проверенные платформой.
  @Get('offers/verification-queue')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  verificationQueue() {
    return this.offers.verificationQueue();
  }

  // Верификация подлинности (админ): сертификаты/партия проверены.
  @Post('offers/:id/verify')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  verify(@Param('id') id: string, @Body('verified') verified: boolean) {
    return this.offers.setVerified(id, verified ?? true);
  }
}
