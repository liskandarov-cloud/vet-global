import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from './payments.service';
import { notPayableReason } from './payable';
import { clickSignatureValid } from './click-sign';

// Click Shop API error codes.
const ERR = {
  OK: 0,
  SIGN: -1,
  AMOUNT: -2,
  ACTION: -3,
  ALREADY_PAID: -4,
  NOT_FOUND: -5,
  TX_NOT_FOUND: -6,
  CANCELLED: -9,
};

@Injectable()
export class ClickService {
  private readonly serviceId?: string;
  private readonly secret?: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly payments: PaymentsService,
  ) {
    this.serviceId = config.get<string>('CLICK_SERVICE_ID');
    this.secret = config.get<string>('CLICK_SECRET_KEY');
  }

  // Подпись проверяется в click-sign.ts: без заданного секрета и сервиса
  // колбэк не принимается вовсе (раньше секретом становилось «undefined»).
  private signed(p: any, stage: 'prepare' | 'complete') {
    return clickSignatureValid(p, { serviceId: this.serviceId, secret: this.secret }, stage);
  }

  // Prepare (action=0): sign = md5(click_trans_id + service_id + secret + merchant_trans_id + amount + action + sign_time)
  async prepare(p: any) {
    if (!this.signed(p, 'prepare')) return this.err(p, ERR.SIGN, 'SIGN CHECK FAILED');

    const payment = await this.prisma.payment.findUnique({ where: { id: p.merchant_trans_id } });
    if (!payment) return this.err(p, ERR.TX_NOT_FOUND, 'Transaction does not exist');
    if (payment.status === PaymentStatus.PAID) return this.err(p, ERR.ALREADY_PAID, 'Already paid');
    if (Math.round(Number(payment.amount)) !== Math.round(Number(p.amount))) {
      return this.err(p, ERR.AMOUNT, 'Incorrect amount');
    }

    const blocked = await this.orderNotPayable(payment.orderId);
    if (blocked) {
      return this.err(p, blocked.code === 'ALREADY_PAID' ? ERR.ALREADY_PAID : ERR.CANCELLED, blocked.message);
    }

    const meta: any = payment.meta ?? {};
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { providerTransId: String(p.click_trans_id), meta: { ...meta, clickPrepareId: payment.id } },
    });

    return {
      click_trans_id: p.click_trans_id,
      merchant_trans_id: p.merchant_trans_id,
      merchant_prepare_id: payment.id,
      error: ERR.OK,
      error_note: 'Success',
    };
  }

  // Complete (action=1): sign adds merchant_prepare_id before amount.
  async complete(p: any) {
    if (!this.signed(p, 'complete')) return this.err(p, ERR.SIGN, 'SIGN CHECK FAILED');

    const payment = await this.prisma.payment.findUnique({ where: { id: p.merchant_trans_id } });
    if (!payment) return this.err(p, ERR.TX_NOT_FOUND, 'Transaction does not exist');
    if (payment.status === PaymentStatus.PAID) return this.err(p, ERR.ALREADY_PAID, 'Already paid');

    // Завершение принимается только для транзакции, прошедшей подготовку, и
    // на ту же сумму: сумма сверялась лишь на подготовке, и завершение на
    // другую сумму (или без подготовки) проводило оплату как есть.
    const meta: any = payment.meta ?? {};
    if (!meta.clickPrepareId || String(p.merchant_prepare_id) !== String(meta.clickPrepareId)) {
      return this.err(p, ERR.TX_NOT_FOUND, 'Transaction was not prepared');
    }
    if (payment.providerTransId && String(payment.providerTransId) !== String(p.click_trans_id)) {
      return this.err(p, ERR.TX_NOT_FOUND, 'Transaction does not match');
    }
    if (Math.round(Number(payment.amount)) !== Math.round(Number(p.amount))) {
      return this.err(p, ERR.AMOUNT, 'Incorrect amount');
    }

    const blocked = await this.orderNotPayable(payment.orderId);
    if (blocked) {
      return this.err(p, blocked.code === 'ALREADY_PAID' ? ERR.ALREADY_PAID : ERR.CANCELLED, blocked.message);
    }

    // Click reports its own failure via a negative `error`.
    if (Number(p.error) < 0) {
      await this.prisma.payment.update({ where: { id: payment.id }, data: { status: PaymentStatus.CANCELLED } });
      return this.err(p, ERR.CANCELLED, 'Transaction cancelled');
    }

    await this.payments.markPaid(payment.id, String(p.click_trans_id));
    return {
      click_trans_id: p.click_trans_id,
      merchant_trans_id: p.merchant_trans_id,
      merchant_confirm_id: payment.id,
      error: ERR.OK,
      error_note: 'Success',
    };
  }

  // Состояние заказа по тем же правилам, что в кабинете и у Payme.
  //
  // Платёж создаётся до ухода на Click, и между созданием и подтверждением
  // заказ могли отменить: без этой проверки Click подтверждал оплату уже
  // отменённого заказа.
  private async orderNotPayable(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: { select: { status: true } } },
    });
    if (!order) return { code: 'CANCELLED' as const, message: 'Заказ не найден' };
    return notPayableReason(order);
  }

  private err(p: any, error: number, note: string) {
    return {
      click_trans_id: p.click_trans_id,
      merchant_trans_id: p.merchant_trans_id,
      error,
      error_note: note,
    };
  }
}
