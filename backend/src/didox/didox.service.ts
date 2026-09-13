import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { DidoxAdapter } from './didox.types';
import { MockDidoxAdapter } from './adapters/mock.adapter';
import { LiveDidoxAdapter } from './adapters/live.adapter';
import { invoiceNumberFor } from '../common/invoice-number';
import { buildFactura } from './factura';

@Injectable()
export class DidoxService {
  private readonly logger = new Logger(DidoxService.name);
  private readonly adapter: DidoxAdapter;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const mode = (config.get<string>('DIDOX_MODE') ?? 'mock').toLowerCase();
    if (mode === 'live') {
      this.adapter = new LiveDidoxAdapter({
        baseUrl: config.get<string>('DIDOX_BASE_URL') ?? 'https://testapi3.didox.uz',
        token: config.get<string>('DIDOX_TOKEN'),
      });
      this.logger.log('Didox adapter: LIVE');
    } else {
      this.adapter = new MockDidoxAdapter();
      this.logger.log('Didox adapter: MOCK (set DIDOX_MODE=live + DIDOX_TOKEN for real ЭДО)');
    }
  }

  // Create & send the factura for an order to Didox; persists didoxId + status.
  async send(orderId: string, user: AuthUser) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, invoice: true, counterparty: true, buyer: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    this.assertAccess(order, user);

    // Повторная отправка документ не дублирует.
    //
    // Счёт-фактура — документ налогового учёта: два документа на одну поставку
    // означают двойную реализацию у продавца. Раньше каждый вызов создавал новый
    // документ, а в базе оставался только последний идентификатор — предыдущий
    // висел в Didox, и о нём уже нельзя было узнать.
    if (order.invoice?.didoxId) {
      return {
        mode: this.adapter.mode,
        didoxId: order.invoice.didoxId,
        didoxStatus: order.invoice.didoxStatus,
        number: order.invoice.number,
        alreadySent: true,
      };
    }

    const number = order.invoice?.number ?? invoiceNumberFor(order);
    const seller = await this.prisma.user.findUnique({ where: { id: order.items[0]?.sellerId } });

    const payload = buildFactura(order, seller, number);
    const total = payload.total;

    const result = await this.adapter.createInvoice(payload);

    const invoice = await this.prisma.invoice.upsert({
      where: { orderId },
      update: { didoxId: result.didoxId, didoxStatus: result.status },
      create: {
        orderId,
        number,
        // Сумма счёта — сумма документа, а не заказа: они различаются на
        // списанные баллы, и хранить здесь сумму заказа значило бы расходиться
        // с отправленным в ЭДО документом.
        amount: total,
        didoxId: result.didoxId,
        didoxStatus: result.status,
      },
    });

    return { mode: this.adapter.mode, didoxId: invoice.didoxId, didoxStatus: invoice.didoxStatus, number };
  }

  // Re-sync the document status from Didox.
  async syncStatus(orderId: string, user: AuthUser) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, invoice: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    this.assertAccess(order, user);
    if (!order.invoice?.didoxId) {
      return { mode: this.adapter.mode, didoxStatus: null, message: 'Документ ещё не отправлен в Didox' };
    }

    const status = await this.adapter.getStatus(order.invoice.didoxId);
    await this.prisma.invoice.update({ where: { orderId }, data: { didoxStatus: status } });
    return { mode: this.adapter.mode, didoxId: order.invoice.didoxId, didoxStatus: status };
  }

  private assertAccess(order: any, user: AuthUser) {
    if (user.role === UserRole.ADMIN) return;
    if (user.role === UserRole.SELLER && order.items?.some((it: any) => it.sellerId === user.id)) return;
    throw new ForbiddenException('Not authorized for this order');
  }
}
