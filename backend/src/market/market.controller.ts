import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { MarketService } from './market.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('market')
@ApiBearerAuth()
@Controller('market')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SELLER, UserRole.ADMIN)
export class MarketController {
  constructor(private readonly market: MarketService) {}

  @Get('insights')
  insights() {
    return this.market.insights();
  }

  @Get('my-position')
  myPosition(@CurrentUser() user: AuthUser) {
    return this.market.myPosition(user);
  }
}
