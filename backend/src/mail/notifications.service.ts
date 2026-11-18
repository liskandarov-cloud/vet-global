import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from './mail.service';
import { SmsService } from '../sms/sms.service';
import { summariesBySeller } from './order-summary';
import { deliveryBySellerForOrder } from '../delivery/order-delivery';
import { consultBody, itemsTable, layout, leadBody, money, orderLine } from './templates';

const STATUS_RU: Record<OrderStatus, string> = {
  PENDING: 'Новый',
  CONFIRMED: 'Подтверждён',
  PROCESSING: 'В обработке',
  SHIPPED: 'Отгружен',
  DELIVERED: 'Доставлен',
  CANCELLED: 'Отменён',
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
    private readonly sms: SmsService,
  ) {}

  // Fire-and-forget: notify buyer (if registered), each involved seller, and admin.
  async onOrderCreated(orderId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, shipments: true },
    });
    if (!order) return;

    const shortId = order.id.slice(0, 8);
    const summary = `
      ${orderLine(shortId, order)}
      ${itemsTable(order.items.map((i) => ({ productName: i.productName, quantity: i.quantity, price: Number(i.price) })))}
      <p style="font-size:16px;color:#0f172a"><b>Итого: ${money(Number(order.total))}</b></p>`;

    // Buyer
    if (order.buyerId) {
      const buyer = await this.prisma.user.findUnique({ where: { id: order.buyerId } });
      if (buyer?.email) {
        await this.mail.send({
          to: buyer.email,
          subject: `Ваш заказ #${shortId} принят — VetHub`,
          html: layout('Заказ принят', `<p style="color:#475569">Мы свяжемся с вами для подтверждения.</p>${summary}`),
        });
      }
    }

    // Продавцам — только их позиции.
    //
    // Письмо было одно на всех, и в заказе от нескольких поставщиков каждый
    // продавец получал перечень чужих товаров с количествами и ценами: прямая
    // утечка коммерческих условий конкуренту, которую нельзя было заметить —
    // письма уходят молча.
    const parts = summariesBySeller(
      order.items.map((i) => ({
        sellerId: i.sellerId,
        productName: i.productName,
        quantity: i.quantity,
        price: Number(i.price),
      })),
      deliveryBySellerForOrder(
        order.deliveryQuote,
        order.shipments.map((sh) => ({ sellerId: sh.sellerId, cost: Number(sh.cost) })),
      ),
      Number(order.vetPointsUsed),
    );
    const sellers = await this.prisma.user.findMany({
      where: { id: { in: parts.map((p) => p.sellerId) } },
    });
    for (const part of parts) {
      const seller = sellers.find((s) => s.id === part.sellerId);
      if (!seller?.email) continue;
      await this.mail.send({
        to: seller.email,
        subject: `Новый заказ #${shortId} — VetHub`,
        html: layout(
          'Новый заказ',
          `${orderLine(shortId, order)}
           ${itemsTable(part.items)}
           <p style="font-size:16px;color:#0f172a"><b>К получению по вашим позициям: ${money(part.total)}</b></p>`,
        ),
      });
    }

    // Admin
    const adminEmail = this.config.get<string>('ADMIN_EMAIL');
    if (adminEmail) {
      await this.mail.send({
        to: adminEmail,
        subject: `[Админ] Новый заказ #${shortId}`,
        html: layout('Новый заказ на платформе', summary),
      });
    }
  }

  // New CRM lead (from Telegram bot or web form) → admin + routed seller.
  async onLeadCreated(leadId: string): Promise<void> {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return;

    const body = leadBody(lead);

    const adminEmail = this.config.get<string>('ADMIN_EMAIL');
    if (adminEmail) {
      await this.mail.send({
        to: adminEmail,
        subject: `Новая заявка от ${lead.fullName} — VetHub`,
        html: layout('Новая заявка (CRM)', body),
      });
    }

    if (lead.sellerId) {
      const seller = await this.prisma.user.findUnique({ where: { id: lead.sellerId } });
      if (seller?.email) {
        await this.mail.send({
          to: seller.email,
          subject: `Заявка на ваш товар — VetHub`,
          html: layout('Заявка на ваш товар', body),
        });
      }
    }
  }

  // New veterinary consultation request → admin.
  async onConsultCreated(consultId: string): Promise<void> {
    const c = await this.prisma.consultRequest.findUnique({ where: { id: consultId } });
    if (!c) return;
    const adminEmail = this.config.get<string>('ADMIN_EMAIL');
    if (!adminEmail) return;
    await this.mail.send({
      to: adminEmail,
      subject: `Новая ветконсультация: ${c.topic} — VetHub`,
      html: layout(
        'Новая ветконсультация',
        consultBody(c),
      ),
    });
  }

  async onOrderStatusChanged(orderId: string, status: OrderStatus): Promise<void> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return;
    const shortId = order.id.slice(0, 8);

    // SMS to the buyer's phone (transactional — ТЗ 3.4 / SRS).
    if (order.buyerPhone) {
      await this.sms.send(order.buyerPhone, `VetHub: заказ #${shortId} — ${STATUS_RU[status]}`);
    }

    // Email (only for registered buyers with an email).
    if (order.buyerId) {
      const buyer = await this.prisma.user.findUnique({ where: { id: order.buyerId } });
      if (buyer?.email) {
        await this.mail.send({
          to: buyer.email,
          subject: `Заказ #${shortId}: ${STATUS_RU[status]} — VetHub`,
          html: layout(
            `Статус заказа обновлён`,
            `<p style="color:#475569">Заказ <b>#${shortId}</b> теперь в статусе:</p>
             <p style="font-size:16px;color:#0d9488"><b>${STATUS_RU[status]}</b></p>`,
          ),
        });
      }
    }
  }
}
