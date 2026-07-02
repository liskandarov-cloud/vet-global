import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { DeliveryMethod, ShipmentStatus, UserRole } from '@prisma/client';
import { DeliveryService } from './delivery.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

class ShipmentBodyDto {
  @IsOptional() @IsEnum(DeliveryMethod) method?: DeliveryMethod;
  @IsOptional() @IsEnum(ShipmentStatus) status?: ShipmentStatus;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() recipientName?: string;
  @IsOptional() @IsString() recipientPhone?: string;
  @IsOptional() @IsNumber() cost?: number;
  @IsOptional() @IsString() carrier?: string;
  @IsOptional() @IsString() trackingNumber?: string;
  @IsOptional() @IsString() estimatedDate?: string;
}

class StatusDto {
  @IsEnum(ShipmentStatus) status: ShipmentStatus;
}

@ApiTags('delivery')
@Controller('orders/:orderId/shipment')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class DeliveryController {
  constructor(private readonly delivery: DeliveryService) {}

  @Get()
  get(@Param('orderId') orderId: string, @CurrentUser() user: AuthUser) {
    return this.delivery.get(orderId, user);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  upsert(@Param('orderId') orderId: string, @Body() dto: ShipmentBodyDto, @CurrentUser() user: AuthUser) {
    return this.delivery.upsert(orderId, dto, user);
  }

  @Patch('status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  setStatus(@Param('orderId') orderId: string, @Body() dto: StatusDto, @CurrentUser() user: AuthUser) {
    return this.delivery.setStatus(orderId, dto.status, user);
  }
}
