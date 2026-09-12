import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { DeliveryMethod, UserRole } from '@prisma/client';
import { TariffsService } from './tariffs.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

class TariffBodyDto {
  @IsEnum(DeliveryMethod) method: DeliveryMethod;
  // Пустой город — тариф по умолчанию для всех городов, кроме перечисленных.
  @IsOptional() @IsString() city?: string;
  @IsNumber() @Min(0) cost: number;
  // Порог бесплатной доставки; не задан — бесплатной доставки нет.
  @IsOptional() @IsNumber() @Min(0) freeFrom?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() note?: string;
}

@ApiTags('delivery')
@Controller('delivery/tariffs')
export class TariffsController {
  constructor(private readonly tariffs: TariffsService) {}

  // Тарифы продавца — свои, чужие не видны.
  @Get('mine')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  mine(@CurrentUser() user: AuthUser) {
    return this.tariffs.listMine(user);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  upsert(@Body() dto: TariffBodyDto, @CurrentUser() user: AuthUser) {
    return this.tariffs.upsert(dto, user);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.tariffs.remove(id, user);
  }

  // Расчёт доставки для корзины покупателя.
  //
  // Считается по каждому продавцу отдельно, потому что тарифы у них свои, а
  // сумма отдаётся общей: покупатель видит одну цифру, но знает, из чего она
  // складывается. Открыт без авторизации — корзину наполняют и гости, и им
  // стоимость доставки нужна до входа.
  @Get('estimate')
  estimate(
    @Query('offerIds') offerIds?: string,
    @Query('productIds') productIds?: string,
    @Query('method') method?: DeliveryMethod,
    @Query('city') city?: string,
    @Query('subtotal') subtotal?: string,
  ) {
    return this.tariffs.estimate({
      offerIds: (offerIds ?? '').split(',').filter(Boolean),
      productIds: (productIds ?? '').split(',').filter(Boolean),
      method: method ?? DeliveryMethod.COURIER,
      city,
      subtotal: Number(subtotal ?? 0),
    });
  }
}
