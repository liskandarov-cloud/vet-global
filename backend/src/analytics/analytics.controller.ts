import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AnalyticsService } from './analytics.service';
import { ExcelService } from '../documents/excel.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('analytics')
@Controller()
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly excel: ExcelService,
  ) {}

  @Get('admin/stats')
  @Roles(UserRole.ADMIN)
  adminStats() {
    return this.analytics.adminStats();
  }

  @Get('admin/billing')
  @Roles(UserRole.ADMIN)
  adminBilling() {
    return this.analytics.adminBilling();
  }

  @Get('admin/billing/export')
  @Roles(UserRole.ADMIN)
  async adminBillingExport(@Res() res: Response) {
    const { rows } = await this.analytics.adminBilling();
    const buffer = await this.excel.sheet(
      'Биллинг',
      [
        { header: 'Поставщик', key: 'company', width: 32 },
        { header: 'Заказов', key: 'orders', width: 10 },
        { header: 'Оборот', key: 'revenue', width: 16 },
        { header: 'Комиссия', key: 'commission', width: 16 },
        { header: 'К выплате', key: 'payout', width: 16 },
      ],
      rows,
    );
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="billing.xlsx"',
    });
    res.send(buffer);
  }

  @Get('seller/stats')
  @Roles(UserRole.SELLER)
  sellerStats(@CurrentUser() user: AuthUser) {
    return this.analytics.sellerStats(user.id);
  }

  @Get('buyer/stats')
  @Roles(UserRole.BUYER)
  buyerStats(@CurrentUser() user: AuthUser) {
    return this.analytics.buyerStats(user.id);
  }
}
