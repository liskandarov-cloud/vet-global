import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ProductsService } from './products.service';
import { StockAlertsService } from './stock-alerts.service';
import { CreateProductDto, ProductQueryDto, UpdateProductDto } from './dto/product.dto';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly products: ProductsService,
    private readonly stockAlerts: StockAlertsService,
  ) {}

  // Токен необязателен: по нему продавец видит свои товары, которых нет на витрине.
  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  list(@Query() q: ProductQueryDto, @CurrentUser() user?: AuthUser) {
    return this.products.list(q, user);
  }

  @Get('facets')
  facets() {
    return this.products.facets();
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  getOne(@Param('id') id: string, @CurrentUser() user?: AuthUser) {
    return this.products.getOne(id, user);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  create(@Body() dto: CreateProductDto, @CurrentUser() user: AuthUser) {
    return this.products.create(dto, user);
  }

  @Put(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateProductDto, @CurrentUser() user: AuthUser) {
    return this.products.update(id, dto, user);
  }

  // Обход подписок «сообщить о поступлении» вне расписания — для эксплуатации
  // и тестов: планировщик ходит раз в 10 минут.
  @Post('stock-alerts/run')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  runStockAlerts() {
    return this.stockAlerts.sweep();
  }

  // «Сообщить о поступлении» — подписка покупателя на возврат товара в наличие.
  @Get(':id/notify-me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  isStockSubscribed(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.products.isStockSubscribed(id, user);
  }

  @Post(':id/notify-me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  subscribeStock(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.products.subscribeStock(id, user);
  }

  @Delete(':id/notify-me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  unsubscribeStock(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.products.unsubscribeStock(id, user);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.products.remove(id, user);
  }
}
