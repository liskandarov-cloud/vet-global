import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from './payments.service';

// Payme JSON-RPC error. Carries the Payme error code + optional data field.
export class PaymeError extends Error {
  constructor(public code: number, message: string, public data?: string) {
    super(message);
  }
}

// Payme transaction states (stored in Payment.meta.paymeState):
// 1 created, 2 performed(paid), -1 cancelled before perform, -2 cancelled after perform.
@Injectable()
export class PaymeService {
  private readonly key?: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly payments: PaymentsService,
  ) {
    this.key = config.get<string>('PAYME_KEY');
  }

  // Basic auth: header "Basic base64(Paycom:KEY)".
  checkAuth(header?: string): boolean {
    if (!this.key || !header?.startsWith('Basic ')) return false;
    const [login, pass] = Buffer.from(header.slice(6), 'base64').toString().split(':');
    return login === 'Paycom' && pass === this.key;
  }

  async dispatch(method: string, params: any): Promise<any> {
    switch (method) {
      case 'CheckPerformTransaction':
        return this.checkPerform(params);
      case 'CreateTransaction':
        return this.createTransaction(params);
      case 'PerformTransaction':
        return this.performTransaction(params);
      case 'CancelTransaction':
        return this.cancelTransaction(params);
      case 'CheckTransaction':
        return this.checkTransaction(params);
      case 'GetStatement':
        return { transactions: [] };
      default:
        throw new PaymeError(-32601, 'Method not found');
    }
  }

  private async orderFor(params: any) {
    const orderId = params?.account?.order_id;
    const order = orderId ? await this.prisma.order.findUnique({ where: { id: orderId } }) : null;
    if (!order) throw new PaymeError(-31050, 'Order not found', 'order_id');
    if (params.amount !== Math.round(Number(order.total) * 100)) {
      throw new PaymeError(-31001, 'Invalid amount');
    }
    return order;
  }

  private async checkPerform(params: any) {
    await this.orderFor(params);
    return { allow: true };
  }

  private async createTransaction(params: any) {
    const existing = await this.prisma.payment.findFirst({ where: { providerTransId: params.id } });
    if (existing) {
      const m: any = existing.meta ?? {};
      if (m.paymeState !== 1) throw new PaymeError(-31008, 'Transaction is not active');
      return { create_time: m.create_time, transaction: existing.id, state: 1 };
    }
    const order = await this.orderFor(params);
    const active = await this.prisma.payment.findFirst({
      where: { orderId: order.id, provider: 'PAYME', status: PaymentStatus.PENDING },
    });
    if (active) throw new PaymeError(-31008, 'Order already has an active transaction');

    const payment = await this.prisma.payment.create({
      data: {
        orderId: order.id,
        provider: 'PAYME',
        amount: order.total,
        status: PaymentStatus.PENDING,
        providerTransId: params.id,
        meta: { paymeState: 1, create_time: params.time },
      },
    });
    return { create_time: params.time, transaction: payment.id, state: 1 };
  }

  private async performTransaction(params: any) {
    const payment = await this.prisma.payment.findFirst({ where: { providerTransId: params.id } });
    if (!payment) throw new PaymeError(-31003, 'Transaction not found');
    const m: any = payment.meta ?? {};
    if (m.paymeState === 2) return { transaction: payment.id, perform_time: m.perform_time, state: 2 };
    if (m.paymeState !== 1) throw new PaymeError(-31008, 'Transaction is not active');

    const perform_time = Date.now();
    await this.payments.markPaid(payment.id, params.id);
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { meta: { ...m, paymeState: 2, perform_time } },
    });
    return { transaction: payment.id, perform_time, state: 2 };
  }

  private async cancelTransaction(params: any) {
    const payment = await this.prisma.payment.findFirst({ where: { providerTransId: params.id } });
    if (!payment) throw new PaymeError(-31003, 'Transaction not found');
    const m: any = payment.meta ?? {};
    const cancel_time = m.cancel_time ?? Date.now();
    const state = m.paymeState === 2 ? -2 : -1;
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: state === -2 ? PaymentStatus.REFUNDED : PaymentStatus.CANCELLED,
        meta: { ...m, paymeState: state, cancel_time, reason: params.reason },
      },
    });
    if (state === -2) {
      await this.prisma.order.update({ where: { id: payment.orderId }, data: { status: OrderStatus.CANCELLED } });
    }
    return { transaction: payment.id, cancel_time, state };
  }

  private async checkTransaction(params: any) {
    const payment = await this.prisma.payment.findFirst({ where: { providerTransId: params.id } });
    if (!payment) throw new PaymeError(-31003, 'Transaction not found');
    const m: any = payment.meta ?? {};
    return {
      create_time: m.create_time ?? 0,
      perform_time: m.perform_time ?? 0,
      cancel_time: m.cancel_time ?? 0,
      transaction: payment.id,
      state: m.paymeState ?? 1,
      reason: m.reason ?? null,
    };
  }
}
