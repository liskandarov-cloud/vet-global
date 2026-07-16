import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { MaintenanceService, ProvisionUserDto } from './maintenance.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('maintenance')
@ApiBearerAuth()
@Controller('maintenance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class MaintenanceController {
  constructor(private readonly maintenance: MaintenanceService) {}

  // Очистка демо/операционных данных (только админ + фраза подтверждения).
  @Post('reset')
  reset(@Body('confirm') confirm: string) {
    return this.maintenance.reset(confirm);
  }

  // Создание/обновление учётной записи с ролью (в т.ч. ADMIN).
  @Post('user')
  provisionUser(@Body() dto: ProvisionUserDto) {
    return this.maintenance.provisionUser(dto);
  }
}
