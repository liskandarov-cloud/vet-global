import { Controller, Get, Headers, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AlertsService } from './alerts.service';
import { wantsUz } from '../common/i18n/uz-messages';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Headers('accept-language') lang?: string) {
    return this.alerts.list(user, wantsUz(lang) ? 'uz' : 'ru');
  }

  @Post('read-all')
  readAll(@CurrentUser() user: AuthUser) {
    return this.alerts.markAllRead(user);
  }

  @Post(':id/read')
  read(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.alerts.markRead(id, user);
  }
}
