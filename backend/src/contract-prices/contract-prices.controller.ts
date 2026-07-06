import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ContractPricesService } from './contract-prices.service';
import { CreateContractPriceDto } from './dto/contract-price.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('contract-prices')
@ApiBearerAuth()
@Controller('contract-prices')
@UseGuards(JwtAuthGuard)
export class ContractPricesController {
  constructor(private readonly contracts: ContractPricesService) {}

  @Get('my')
  listMy(@CurrentUser() user: AuthUser, @Query('productId') productId?: string) {
    return this.contracts.listMy(user, productId);
  }

  @Get('seller')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  listSeller(@CurrentUser() user: AuthUser) {
    return this.contracts.listSeller(user);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  create(@Body() dto: CreateContractPriceDto, @CurrentUser() user: AuthUser) {
    return this.contracts.create(dto, user);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.contracts.remove(id, user);
  }
}
