import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Audit } from '../audit/audit.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { MaintenanceService, ProvisionUserDto } from './maintenance.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { integrationsStatus } from './integrations';

@ApiTags('maintenance')
@ApiBearerAuth()
@Controller('maintenance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class MaintenanceController {
  constructor(
    private readonly maintenance: MaintenanceService,
    private readonly config: ConfigService,
  ) {}

  // Какие интеграции работают по-настоящему и каких ключей не хватает.
  @Get('integrations')
  integrations() {
    return integrationsStatus((k) => this.config.get<string>(k));
  }

  // Очистка демо/операционных данных (только админ + фраза подтверждения).
  @Audit('maintenance.reset', 'System')
  @Post('reset')
  reset(@Body('confirm') confirm: string) {
    return this.maintenance.reset(confirm);
  }

  // Создание/обновление учётной записи с ролью (в т.ч. ADMIN).
  @Audit('user.provision', 'User')
  @Post('user')
  provisionUser(@Body() dto: ProvisionUserDto) {
    return this.maintenance.provisionUser(dto);
  }

  // Синхронизация брендов с производителями товаров.
  @Audit('maintenance.syncBrands', 'Brand')
  @Post('sync-brands')
  syncBrands() {
    return this.maintenance.syncBrands();
  }
}
