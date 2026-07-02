import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrderStatus, UserRole } from '@prisma/client';
import { OrdersService } from './orders.service';
import { CreateOrderDto, UpdateStatusDto } from './dto/order.dto';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { ExcelService } from '../documents/excel.service';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly excel: ExcelService,
  ) {}

  // Guest or authenticated checkout.
  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  create(@Body() dto: CreateOrderDto, @CurrentUser() user?: AuthUser) {
    return this.orders.create(dto, user);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  list(@CurrentUser() user: AuthUser, @Query('status') status?: OrderStatus) {
    return this.orders.list(user, status);
  }

  // Excel export of the caller's orders (buyer purchases / seller sales).
  @Get('export')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async export(@CurrentUser() user: AuthUser, @Res() res: Response) {
    const orders = await this.orders.list(user);
    const rows = orders.map((o: any) => ({
      id: o.id.slice(0, 8),
      date: new Date(o.createdAt).toLocaleDateString('ru-RU'),
      buyer: o.buyerName,
      company: o.buyerCompany ?? '',
      status: o.status,
      itemsCount: o.items?.length ?? 0,
      subtotal: o.subtotal,
      total: o.total,
    }));
    const buffer = await this.excel.sheet(
      'Заказы',
      [
        { header: '№', key: 'id', width: 12 },
        { header: 'Дата', key: 'date', width: 14 },
        { header: 'Покупатель', key: 'buyer', width: 24 },
        { header: 'Компания', key: 'company', width: 24 },
        { header: 'Статус', key: 'status', width: 14 },
        { header: 'Позиций', key: 'itemsCount', width: 10 },
        { header: 'Сумма позиций', key: 'subtotal', width: 16 },
        { header: 'Итого', key: 'total', width: 16 },
      ],
      rows,
    );
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="orders.xlsx"',
    });
    res.send(buffer);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.orders.getOne(id, user);
  }

  @Patch(':id/status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto, @CurrentUser() user: AuthUser) {
    return this.orders.updateStatus(id, dto.status, user);
  }

  // Streams the invoice PDF (счёт на оплату).
  @Get(':id/invoice')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async invoice(@Param('id') id: string, @CurrentUser() user: AuthUser, @Res() res: Response) {
    const { buffer, number } = await this.orders.invoicePdf(id, user);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="invoice-${number}.pdf"`,
    });
    res.send(buffer);
  }
}
