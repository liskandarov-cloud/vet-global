import {
  BadRequestException,
  ConflictException, ForbiddenException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { DidoxAdapter } from './didox.types';
import { MockDidoxAdapter } from './adapters/mock.adapter';
import { LiveDidoxAdapter } from './adapters/live.adapter';
import { invoiceNumberFor } from '../common/invoice-number';
import { buildFactura } from './factura';
import { splitInvoices } from '../orders/invoice-split';
import { deliveryBySellerForOrder } from '../delivery/order-delivery';
import { DIDOX_OFF, didoxMode, type DidoxMode } from './mode';

// Сколько держится захват отправки, если процесс упал посреди неё.
const SENDING_STALE_MS = 5 * 60_000;

@Injectable()
export class DidoxService implements OnModuleInit {
  private readonly logger = new Logger(DidoxService.name);
  private readonly adapter?: DidoxAdapter;
  private readonly mode: DidoxMode;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.mode = didoxMode((k) => config.get<string>(k));
    if (this.mode === 'live') {
      this.adapter = new LiveDidoxAdapter({
        baseUrl: config.get<string>('DIDOX_BASE_URL') ?? 'https://testapi3.didox.uz',
        token: config.get<string>('DIDOX_TOKEN'),
      });
    } else if (this.mode === 'demo') {
      this.adapter = new MockDidoxAdapter();
    }
    this.logger.log(`Didox: ${this.mode}`);
  }

  // Документы, «выпущенные» имитацией, когда она стояла на проде, — не настоящие:
  // их статус «подписан» вводит в заблуждение и мешает отменить часть заказа.
  async onModuleInit() {
    if (this.mode === 'demo') return;
    const { count } = await this.prisma.invoice.updateMany({
      where: { didoxId: { startsWith: 'MOCK-' } },
      data: { didoxId: null, didoxStatus: null, signature: null, signedAt: null },
    });
    if (count) this.logger.warn(`Сброшено ${count} имитированных документов Didox`);
  }

  private live(): DidoxAdapter {
    if (!this.adapter) throw new BadRequestException(DIDOX_OFF);
    return this.adapter;
  }

  // Выпуск счёта-фактуры по заказу — по одному документу на продавца.
  //
  // Счёт-фактура это документ между двумя юрлицами: ИНН продавца в нём его,
  // реализация его. Раньше документ был один на заказ и выпускался от первого
  // продавца — то есть от чужого имени и на чужие позиции. Продавец выпускает
  // свой документ, администратор — все по заказу.
  async send(orderId: string, user: AuthUser) {
    this.live();
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        invoices: true,
        shipments: true,
        counterparty: true,
        buyer: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    this.assertAccess(order, user);

    const split = splitInvoices(
      order.items.map((it) => ({
        sellerId: it.sellerId,
        productName: it.productName,
        mxikCode: it.mxikCode,
        packageCode: it.packageCode,
        quantity: it.quantity,
        price: Number(it.price),
      })),
      deliveryBySellerForOrder(
        order.deliveryQuote,
        order.shipments.map((sh) => ({ sellerId: sh.sellerId, cost: Number(sh.cost) })),
      ),
      Number(order.vetPointsUsed),
    );

    // Продавец выпускает только свой документ: чужой он не выпускает даже по
    // прямому запросу.
    const parts = user.role === UserRole.SELLER ? split.filter((p) => p.sellerId === user.id) : split;
    if (!parts.length) throw new NotFoundException('В заказе нет позиций этого продавца');

    const documents: {
      sellerId: string;
      didoxId: string | null;
      didoxStatus: string | null;
      number: string;
      alreadySent?: boolean;
    }[] = [];
    for (const part of parts) {
      // Документ на весь заказ (пустой sellerId) — формат счетов, выпущенных до
      // разделения по продавцам: при единственном продавце он им и остаётся.
      const invoiceSellerId = split.length === 1 ? '' : part.sellerId;
      const existing = order.invoices.find((inv) => inv.sellerId === invoiceSellerId);

      // Повторная отправка документ не дублирует: два счёта-фактуры на одну
      // поставку означают двойную реализацию у продавца.
      if (existing?.didoxId) {
        documents.push({
          sellerId: part.sellerId,
          didoxId: existing.didoxId,
          didoxStatus: existing.didoxStatus,
          number: existing.number,
          alreadySent: true,
        });
        continue;
      }

      const number = existing?.number ?? invoiceNumberFor(order, invoiceSellerId || null);
      const seller = await this.prisma.user.findUnique({ where: { id: part.sellerId } });

      // Баллы в счёт-фактуру не идут: их оплачивает платформа, продавцу
      // выплачивается полная стоимость позиций, значит и реализация полная.
      const payload = buildFactura(
        { ...order, items: part.items, deliveryCost: part.delivery },
        seller,
        number,
      );

      // Захват строки до обращения к Didox. Проверка «уже отправлен» выше видит
      // только завершённую отправку: двойное нажатие проходило её дважды, и
      // Didox выпускал два счёта-фактуры на одну поставку — двойную реализацию,
      // которую наша база уже не отменит. Зависший захват (сбой посреди
      // отправки) истекает через SENDING_STALE_MS.
      const where = { orderId_sellerId: { orderId, sellerId: invoiceSellerId } };
      await this.prisma.invoice.upsert({
        where,
        update: {},
        // Сумма документа, а не сумма заказа: они различаются на баллы.
        create: { orderId, sellerId: invoiceSellerId, number, amount: payload.total },
      });
      const now = new Date();
      const claimed = await this.prisma.invoice.updateMany({
        where: {
          orderId,
          sellerId: invoiceSellerId,
          didoxId: null,
          OR: [{ sendingAt: null }, { sendingAt: { lt: new Date(now.getTime() - SENDING_STALE_MS) } }],
        },
        data: { sendingAt: now },
      });
      if (!claimed.count) {
        const current = await this.prisma.invoice.findUnique({ where });
        if (!current?.didoxId) throw new ConflictException('Счёт-фактура уже отправляется — обновите страницу через минуту');
        documents.push({ sellerId: part.sellerId, didoxId: current.didoxId, didoxStatus: current.didoxStatus, number: current.number, alreadySent: true });
        continue;
      }

      let result: Awaited<ReturnType<DidoxAdapter['createInvoice']>>;
      try {
        result = await this.live().createInvoice(payload);
      } catch (e) {
        // Строка, созданная только ради захвата, не должна остаться «выставленным
        // счётом»: её наличие запрещает менять сумму заказа (delivery.service).
        if (existing) await this.prisma.invoice.update({ where, data: { sendingAt: null } });
        else await this.prisma.invoice.delete({ where });
        throw e;
      }
      const invoice = await this.prisma.invoice.update({
        where,
        data: { didoxId: result.didoxId, didoxStatus: result.status, sendingAt: null },
      });

      documents.push({
        sellerId: part.sellerId,
        didoxId: invoice.didoxId,
        didoxStatus: invoice.didoxStatus,
        number: invoice.number,
      });
    }

    return { mode: this.mode, documents };
  }

  // Обновление статусов документов заказа из Didox.
  //
  // Документов может быть несколько — по одному на продавца, и статус у каждого
  // свой: один продавец подписал, другой ещё нет.
  async syncStatus(orderId: string, user: AuthUser) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, invoices: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    this.assertAccess(order, user);

    const own =
      user.role === UserRole.SELLER
        ? order.invoices.filter((inv) => inv.sellerId === user.id || inv.sellerId === '')
        : order.invoices;
    const sent = own.filter((inv) => inv.didoxId);
    if (!sent.length) {
      return { mode: this.mode, documents: [], message: 'Документ ещё не отправлен в Didox' };
    }

    const documents: { sellerId: string; didoxId: string | null; number: string; didoxStatus: string }[] = [];
    for (const inv of sent) {
      const status = await this.live().getStatus(inv.didoxId!);
      await this.prisma.invoice.update({ where: { id: inv.id }, data: { didoxStatus: status } });
      documents.push({ sellerId: inv.sellerId, didoxId: inv.didoxId, number: inv.number, didoxStatus: status });
    }
    return { mode: this.mode, documents };
  }

  private assertAccess(order: any, user: AuthUser) {
    if (user.role === UserRole.ADMIN) return;
    if (user.role === UserRole.SELLER && order.items?.some((it: any) => it.sellerId === user.id)) return;
    throw new ForbiddenException('Not authorized for this order');
  }
}
