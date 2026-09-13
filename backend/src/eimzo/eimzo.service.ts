import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class EimzoService {
  private readonly logger = new Logger(EimzoService.name);
  private readonly live: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.live = (config.get<string>('DIDOX_MODE') ?? 'mock').toLowerCase() === 'live';
  }

  // Returns the document payload that the client must sign with E-IMZO (ЭЦП).
  async prepare(orderId: string, user: AuthUser, sellerId?: string) {
    const order = await this.getAccessibleOrder(orderId, user);
    const invoice = this.pickInvoice(order, user, sellerId);
    if (!invoice?.didoxId) {
      throw new BadRequestException('Сначала отправьте счёт-фактуру в Didox (ЭДО)');
    }
    // Data-to-sign: the Didox document content (here — the invoice identity + amount).
    // In live mode this is the exact document text/hash returned by Didox.
    const dataToSign = Buffer.from(
      JSON.stringify({ didoxId: invoice.didoxId, number: invoice.number, amount: Number(invoice.amount) }),
    ).toString('base64');

    return { orderId, didoxId: invoice.didoxId, documentBase64: dataToSign };
  }

  // Accepts the PKCS#7 signature produced by E-IMZO and finalises the document.
  async sign(orderId: string, pkcs7: string, user: AuthUser, sellerId?: string) {
    const order = await this.getAccessibleOrder(orderId, user);
    const target = this.pickInvoice(order, user, sellerId);
    if (!target) throw new BadRequestException('Нет счёта для подписания');
    if (!pkcs7 || pkcs7.length < 8) throw new BadRequestException('Пустая или некорректная подпись');

    if (this.live) {
      // TODO(eimzo-live): POST the PKCS#7 to Didox (e.g. /v2/documents/{id}/sign) to
      // attach the signature and move the document to SIGNED on their side.
      this.logger.log(`(live) forwarding PKCS7 for ${target.didoxId} to Didox — TODO`);
    } else {
      this.logger.log(`(mock) accepted PKCS7 signature for order ${orderId}`);
    }

    const invoice = await this.prisma.invoice.update({
      where: { id: target.id },
      data: { signature: pkcs7, signedAt: new Date(), didoxStatus: 'SIGNED' },
    });
    return {
      orderId,
      sellerId: invoice.sellerId,
      number: invoice.number,
      didoxStatus: invoice.didoxStatus,
      signedAt: invoice.signedAt,
    };
  }

  // Какой именно документ подписывается.
  //
  // Счёт-фактура выпускается по одному на продавца: подписывать «счёт заказа»
  // больше нельзя, потому что их может быть несколько и принадлежат они разным
  // юрлицам. Продавцу достаётся его собственный — чужой он не подпишет даже по
  // прямому запросу.
  private pickInvoice(order: any, user: AuthUser, sellerId?: string) {
    const all: any[] = order.invoices ?? [];
    const candidates =
      user.role === UserRole.SELLER
        ? all.filter((inv) => inv.sellerId === user.id || inv.sellerId === '')
        : sellerId
          ? all.filter((inv) => inv.sellerId === sellerId)
          : all;

    if (!candidates.length) return null;
    if (candidates.length === 1) return candidates[0];
    throw new BadRequestException(
      `По заказу несколько счетов — укажите продавца: ${candidates.map((inv) => inv.sellerId).join(', ')}`,
    );
  }

  private async getAccessibleOrder(orderId: string, user: AuthUser) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, invoices: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (user.role === UserRole.ADMIN) return order;
    if (user.role === UserRole.SELLER && order.items.some((it) => it.sellerId === user.id)) return order;
    if (user.role === UserRole.BUYER && order.buyerId === user.id) return order;
    throw new ForbiddenException('Not authorized for this order');
  }
}
