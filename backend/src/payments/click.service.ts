import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from './payments.service';

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

  private md5(s: string) {
    return createHash('md5').update(s).digest('hex');
  }

  // Prepare (action=0): sign = md5(click_trans_id + service_id + secret + merchant_trans_id + amount + action + sign_time)
  async prepare(p: any) {
    const expected = this.md5(
      `${p.click_trans_id}${p.service_id}${this.secret}${p.merchant_trans_id}${p.amount}${p.action}${p.sign_time}`,
    );
    if (expected !== p.sign_string) return this.err(p, ERR.SIGN, 'SIGN CHECK FAILED');

    const payment = await this.prisma.payment.findUnique({ where: { id: p.merchant_trans_id } });
    if (!payment) return this.err(p, ERR.TX_NOT_FOUND, 'Transaction does not exist');
    if (payment.status === PaymentStatus.PAID) return this.err(p, ERR.ALREADY_PAID, 'Already paid');
    if (Math.round(Number(payment.amount)) !== Math.round(Number(p.amount))) {
      return this.err(p, ERR.AMOUNT, 'Incorrect amount');
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
    const expected = this.md5(
      `${p.click_trans_id}${p.service_id}${this.secret}${p.merchant_trans_id}${p.merchant_prepare_id}${p.amount}${p.action}${p.sign_time}`,
    );
    if (expected !== p.sign_string) return this.err(p, ERR.SIGN, 'SIGN CHECK FAILED');

    const payment = await this.prisma.payment.findUnique({ where: { id: p.merchant_trans_id } });
    if (!payment) return this.err(p, ERR.TX_NOT_FOUND, 'Transaction does not exist');
    if (payment.status === PaymentStatus.PAID) return this.err(p, ERR.ALREADY_PAID, 'Already paid');

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

  private err(p: any, error: number, note: string) {
    return {
      click_trans_id: p.click_trans_id,
      merchant_trans_id: p.merchant_trans_id,
      error,
      error_note: note,
    };
  }
}
