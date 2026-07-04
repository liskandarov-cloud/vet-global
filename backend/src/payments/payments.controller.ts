import { Body, Controller, Get, Headers, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { PaymentProvider } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { PaymeService, PaymeError } from './payme.service';
import { ClickService } from './click.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

class CreatePaymentDto {
  @IsString() orderId: string;
  @IsEnum(PaymentProvider) provider: PaymentProvider;
}

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly payme: PaymeService,
    private readonly click: ClickService,
  ) {}

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

  // ── Payme Merchant API (JSON-RPC, public; Basic auth Paycom:KEY) ──
  @Post('payme')
  async paymeWebhook(@Headers('authorization') auth: string, @Body() body: any) {
    const id = body?.id ?? null;
    if (!this.payme.checkAuth(auth)) {
      return { jsonrpc: '2.0', id, error: { code: -32504, message: 'Insufficient privileges' } };
    }
    try {
      const result = await this.payme.dispatch(body?.method, body?.params ?? {});
      return { jsonrpc: '2.0', id, result };
    } catch (e) {
      if (e instanceof PaymeError) {
        return { jsonrpc: '2.0', id, error: { code: e.code, message: e.message, data: e.data } };
      }
      return { jsonrpc: '2.0', id, error: { code: -32400, message: 'Internal error' } };
    }
  }

  // ── Click Shop API (public; md5 signature) ──
  @Post('click/prepare')
  clickPrepare(@Body() body: any) {
    return this.click.prepare(body);
  }

  @Post('click/complete')
  clickComplete(@Body() body: any) {
    return this.click.complete(body);
  }
}
