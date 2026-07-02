import { Body, Controller, Get, Headers, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { SyncService, PriceItem } from './sync.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('sync')
@Controller('sync')
export class SyncController {
  constructor(private readonly sync: SyncService) {}

  // ── Seller: manage the integration key ──
  @Post('key')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  generateKey(@CurrentUser() user: AuthUser) {
    return this.sync.generateKey(user.id);
  }

  @Get('key')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  getKey(@CurrentUser() user: AuthUser) {
    return this.sync.getKey(user.id);
  }

  // ── Integration endpoints (auth via X-Sync-Key header, not JWT) ──
  // JSON feed: { items: [{ externalId, price?, quantity?, inStock? }] }
  @Post('price')
  applyJson(@Headers('x-sync-key') key: string, @Body() body: { items: PriceItem[] }) {
    return this.sync.applyPrices(key, body?.items ?? []);
  }

  // CommerceML (1C) XML feed — send with Content-Type: application/xml.
  @Post('price/xml')
  applyXml(@Headers('x-sync-key') key: string, @Body() xml: string) {
    const items = this.sync.parseCommerceML(typeof xml === 'string' ? xml : '');
    return this.sync.applyPrices(key, items);
  }
}
