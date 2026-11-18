import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus, PaymentProvider, PaymentStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OrderReleaseService } from '../orders/order-release.service';
import { notPayableReason, statusAfterPayment } from './payable';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { buildCheckoutUrl } from './providers';
import { frontendUrl } from '../common/frontend-url';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly mock: boolean;
  private readonly returnUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly release: OrderReleaseService,
  ) {
    this.mock = (config.get<string>('PAYMENTS_MODE') ?? 'mock').toLowerCase() !== 'live';
    this.returnUrl = config.get<string>('PAYMENT_RETURN_URL') ?? frontendUrl();
  }

  async create(orderId: string, provider: PaymentProvider, user: AuthUser) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      // Платежи нужны, чтобы не создать второй платёж по оплаченному заказу.
      include: { payments: { select: { status: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    this.assertPayer(order.buyerId, user);
    // Правило оплатимости общее с протоколами Payme и Click: провайдеры
    // попадают в систему минуя эту проверку, и держать её здесь в одиночку
    // значит разрешить им то, что запрещено в кабинете.
    const notPayable = notPayableReason(order);
    if (notPayable) throw new BadRequestException(notPayable.message);

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
      include: { order: { select: { status: true } } },
    });
    // Оплата подтверждает только новый заказ. Заказ по отсрочке платится уже
    // отгруженным или доставленным, и прежний безусловный перевод в CONFIRMED
    // откатывал его назад по потоку.
    const next = statusAfterPayment(payment.order.status);
    if (next !== payment.order.status) {
      await this.prisma.order.update({ where: { id: payment.orderId }, data: { status: next } });
    }
    // Лимит резервировался под неоплаченный долг: после оплаты он должен
    // освободиться, иначе отсрочка расходует лимит покупателя навсегда.
    await this.release.onPaid(payment.orderId);
    this.logger.log(`Payment ${paymentId} PAID (${payment.provider}) → order ${payment.orderId} ${next}`);
    return { id: payment.id, status: payment.status, orderId: payment.orderId };
  }

  // Возврат денег провайдером: заказ отменяется и всё занятое возвращается.
  //
  // Раньше протокол Payme правил статус заказа напрямую, и возврат проходил
  // мимо возврата ресурсов: деньги покупателю возвращались, а его баллы
  // оставались списанными, товар — снятым со склада.
  async onRefunded(orderId: string): Promise<void> {
    await this.prisma.order.update({ where: { id: orderId }, data: { status: OrderStatus.CANCELLED } });
    await this.release.onCancelled(orderId);
    this.logger.log(`возврат по заказу ${orderId}: заказ отменён, занятое возвращено`);
  }

  private async getOwned(id: string, user: AuthUser) {
    const payment = await this.prisma.payment.findUnique({ where: { id }, include: { order: true } });
    if (!payment) throw new NotFoundException('Payment not found');
    this.assertPayer(payment.order.buyerId, user);
    return payment;
  }

  // Платит покупатель заказа; администратор — для разбора случаев.
  //
  // Проверка стояла только для роли BUYER, и продавец проходил её всегда: в
  // демо-режиме платежей (он же на проде) любой продавец создавал платёж по
  // любому заказу, в том числе без своих позиций, и подтверждал его — заказ
  // становился оплаченным и подтверждённым без денег. Продавец, который сам
  // покупает, остаётся покупателем своего заказа и платит как обычно.
  private assertPayer(orderBuyerId: string | null, user: AuthUser) {
    if (user.role === UserRole.ADMIN) return;
    if (!orderBuyerId || orderBuyerId !== user.id) {
      throw new ForbiddenException('Not authorized');
    }
  }
}
