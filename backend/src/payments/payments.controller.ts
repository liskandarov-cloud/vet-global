import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { PaymentProvider } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

class CreatePaymentDto {
  @IsString() orderId: string;
  @IsEnum(PaymentProvider) provider: PaymentProvider;
}

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  // Initiate a payment for an order — returns a provider checkout URL.
  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreatePaymentDto, @CurrentUser() user: AuthUser) {
    return this.payments.create(dto.orderId, dto.provider, user);
  }

  @Get(':id/status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  status(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.payments.status(id, user);
  }

  // Mock mode only — simulates the provider's success callback.
  @Post(':id/mock-confirm')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  mockConfirm(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.payments.mockConfirm(id, user);
  }

  // ── Live webhooks (public) — SKELETONS ──
  // TODO(click-live): implement Click prepare/complete signature verification.
  @Post('webhook/click')
  clickWebhook(@Body() body: any) {
    return { error: 0, note: 'Click webhook skeleton — implement signature check + markPaid' };
  }

  // TODO(payme-live): implement Payme JSON-RPC (CheckPerformTransaction, PerformTransaction...).
  @Post('webhook/payme')
  paymeWebhook(@Body() body: any) {
    return { note: 'Payme JSON-RPC skeleton — implement merchant methods + markPaid' };
  }
}
