import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('analytics')
@Controller()
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('admin/stats')
  @Roles(UserRole.ADMIN)
  adminStats() {
    return this.analytics.adminStats();
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
