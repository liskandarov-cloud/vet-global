import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AlertsService } from './alerts.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.alerts.list(user);
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
