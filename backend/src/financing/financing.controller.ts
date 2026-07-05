import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CreditStatus, UserRole } from '@prisma/client';
import { FinancingService } from './financing.service';
import { ApplyCreditDto, DecideCreditDto } from './dto/financing.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('financing')
@ApiBearerAuth()
@Controller('financing')
@UseGuards(JwtAuthGuard)
export class FinancingController {
  constructor(private readonly financing: FinancingService) {}

  @Post('apply')
  apply(@Body() dto: ApplyCreditDto, @CurrentUser() user: AuthUser) {
    return this.financing.apply(dto, user);
  }

  @Get('me')
  myStatus(@CurrentUser() user: AuthUser) {
    return this.financing.myStatus(user);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  list(@Query('status') status?: CreditStatus) {
    return this.financing.list(status);
  }

  @Post(':id/decide')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  decide(@Param('id') id: string, @Body() dto: DecideCreditDto) {
    return this.financing.decide(id, dto);
  }
}
