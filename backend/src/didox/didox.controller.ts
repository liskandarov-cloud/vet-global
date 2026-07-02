import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { DidoxService } from './didox.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('didox')
@Controller('didox')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SELLER, UserRole.ADMIN)
export class DidoxController {
  constructor(private readonly didox: DidoxService) {}

  // Generate & send the e-invoice (счёт-фактура) for an order to Didox.
  @Post('send/:orderId')
  send(@Param('orderId') orderId: string, @CurrentUser() user: AuthUser) {
    return this.didox.send(orderId, user);
  }

  // Pull the current document status from Didox.
  @Get('status/:orderId')
  status(@Param('orderId') orderId: string, @CurrentUser() user: AuthUser) {
    return this.didox.syncStatus(orderId, user);
  }
}
