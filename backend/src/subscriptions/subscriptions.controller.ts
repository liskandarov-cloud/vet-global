import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto, UpdateSubscriptionDto } from './dto/subscription.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(private readonly subs: SubscriptionsService) {}

  @Get()
  listMine(@CurrentUser() user: AuthUser) {
    return this.subs.listMine(user);
  }

  @Post()
  create(@Body() dto: CreateSubscriptionDto, @CurrentUser() user: AuthUser) {
    return this.subs.create(dto, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSubscriptionDto, @CurrentUser() user: AuthUser) {
    return this.subs.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.subs.remove(id, user);
  }

  @Post(':id/run')
  runNow(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.subs.runNow(id, user);
  }

  // Плановая обработка — вызывается планировщиком с админ-токеном.
  @Post('run-due')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  runDue() {
    return this.subs.runDue();
  }
}
