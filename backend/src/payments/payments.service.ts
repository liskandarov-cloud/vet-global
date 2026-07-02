import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus, PaymentProvider, PaymentStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { buildCheckoutUrl } from './providers';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly mock: boolean;
  private readonly returnUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.mock = (config.get<string>('PAYMENTS_MODE') ?? 'mock').toLowerCase() !== 'live';
    this.returnUrl = config.get<string>('PAYMENT_RETURN_URL') ?? config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
  }

  async create(orderId: string, provider: PaymentProvider, user: AuthUser) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (user.role === UserRole.BUYER && order.buyerId !== user.id) {
      throw new ForbiddenException('Not authorized');
    }

    const amount = Number(order.total);
    const payment = await this.prisma.payment.create({
      data: { orderId, provider, amount, status: PaymentStatus.PENDING },
    });

    const paymentUrl = this.mock
      ? `${this.returnUrl}/pay/${payment.id}?mock=1`
      : buildCheckoutUrl(provider, {
          paymentId: payment.id,
          orderId,
          amountSum: amount,
          returnUrl: `${this.returnUrl}/dashboard`,
          config: {
            clickServiceId: this.config.get('CLICK_SERVICE_ID'),
            clickMerchantId: this.config.get('CLICK_MERCHANT_ID'),
            paymeMerchantId: this.config.get('PAYME_MERCHANT_ID'),
            uzumMerchantId: this.config.get('UZUM_MERCHANT_ID'),
          },
        });

    await this.prisma.payment.update({ where: { id: payment.id }, data: { paymentUrl } });
    return { id: payment.id, provider, amount, status: payment.status, paymentUrl, mock: this.mock };
  }

  async status(id: string, user: AuthUser) {
    const payment = await this.getOwned(id, user);
    // TODO(live): poll Click/Payme for real status here.
    return { id: payment.id, status: payment.status, provider: payment.provider };
  }

  // Mock-only: simulates a successful provider callback.
  async mockConfirm(id: string, user: AuthUser) {
    if (!this.mock) throw new BadRequestException('mock-confirm available only in mock mode');
    const payment = await this.getOwned(id, user);
    return this.markPaid(payment.id, `MOCK-${payment.id.slice(0, 8)}`);
  }

  // Shared: mark a payment paid and confirm its order.
  async markPaid(paymentId: string, providerTransId?: string) {
    const payment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.PAID, providerTransId },
    });
    await this.prisma.order.update({
      where: { id: payment.orderId },
      data: { status: OrderStatus.CONFIRMED },
    });
    this.logger.log(`Payment ${paymentId} PAID (${payment.provider}) → order ${payment.orderId} CONFIRMED`);
    return { id: payment.id, status: payment.status, orderId: payment.orderId };
  }

  private async getOwned(id: string, user: AuthUser) {
    const payment = await this.prisma.payment.findUnique({ where: { id }, include: { order: true } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (user.role === UserRole.BUYER && payment.order.buyerId !== user.id) {
      throw new ForbiddenException('Not authorized');
    }
    return payment;
  }
}
