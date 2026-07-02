import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from './mail.service';
import { SmsService } from '../sms/sms.service';

const STATUS_RU: Record<OrderStatus, string> = {
  PENDING: 'Новый',
  CONFIRMED: 'Подтверждён',
  PROCESSING: 'В обработке',
  SHIPPED: 'Отгружен',
  DELIVERED: 'Доставлен',
  CANCELLED: 'Отменён',
};

const money = (n: number) => `${Math.round(n).toLocaleString('ru-RU')} сум`;

function layout(title: string, body: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif">
  <div style="max-width:560px;margin:24px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
    <div style="background:linear-gradient(90deg,#0d9488,#10b981);padding:20px 24px;color:#fff">
      <div style="font-size:20px;font-weight:800">VetGlobal</div>
    </div>
    <div style="padding:24px">
      <h2 style="margin:0 0 12px;color:#0f172a;font-size:18px">${title}</h2>
      ${body}
    </div>
    <div style="padding:16px 24px;border-top:1px solid #f1f5f9;color:#94a3b8;font-size:12px">
      Это автоматическое уведомление платформы VetGlobal.
    </div>
  </div></body></html>`;
}

function itemsTable(items: { productName: string; quantity: number; price: number }[]): string {
  const rows = items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0;color:#475569">${i.productName} × ${i.quantity}</td>
         <td style="padding:6px 0;text-align:right;color:#0f172a">${money(i.price * i.quantity)}</td></tr>`,
    )
    .join('');
  return `<table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:14px">${rows}</table>`;
}

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
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) return;

    const shortId = order.id.slice(0, 8);
    const summary = `
      <p style="color:#475569">Заказ <b>#${shortId}</b> от ${order.buyerName} (${order.buyerPhone})${order.buyerCompany ? `, ${order.buyerCompany}` : ''}.</p>
      ${itemsTable(order.items.map((i) => ({ productName: i.productName, quantity: i.quantity, price: Number(i.price) })))}
      <p style="font-size:16px;color:#0f172a"><b>Итого: ${money(Number(order.total))}</b></p>`;

    // Buyer
    if (order.buyerId) {
      const buyer = await this.prisma.user.findUnique({ where: { id: order.buyerId } });
      if (buyer?.email) {
        await this.mail.send({
          to: buyer.email,
          subject: `Ваш заказ #${shortId} принят — VetGlobal`,
          html: layout('Заказ принят', `<p style="color:#475569">Мы свяжемся с вами для подтверждения.</p>${summary}`),
        });
      }
    }

    // Sellers involved in this order
    const sellerIds = [...new Set(order.items.map((i) => i.sellerId))];
    const sellers = await this.prisma.user.findMany({ where: { id: { in: sellerIds } } });
    for (const s of sellers) {
      if (s.email) {
        await this.mail.send({
          to: s.email,
          subject: `Новый заказ #${shortId} — VetGlobal`,
          html: layout('Новый заказ', summary),
        });
      }
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

    const body = `
      <p style="color:#475569">Источник: <b>${lead.source}</b></p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin:12px 0">
        <tr><td style="padding:4px 0;color:#94a3b8">Имя</td><td style="padding:4px 0;color:#0f172a">${lead.fullName}</td></tr>
        <tr><td style="padding:4px 0;color:#94a3b8">Телефон</td><td style="padding:4px 0;color:#0f172a">${lead.phone}</td></tr>
        ${lead.productName ? `<tr><td style="padding:4px 0;color:#94a3b8">Товар</td><td style="padding:4px 0;color:#0f172a">${lead.productName}${lead.quantity ? ` × ${lead.quantity}` : ''}</td></tr>` : ''}
        ${lead.message ? `<tr><td style="padding:4px 0;color:#94a3b8">Сообщение</td><td style="padding:4px 0;color:#0f172a">${lead.message}</td></tr>` : ''}
      </table>`;

    const adminEmail = this.config.get<string>('ADMIN_EMAIL');
    if (adminEmail) {
      await this.mail.send({
        to: adminEmail,
        subject: `Новая заявка от ${lead.fullName} — VetGlobal`,
        html: layout('Новая заявка (CRM)', body),
      });
    }

    if (lead.sellerId) {
      const seller = await this.prisma.user.findUnique({ where: { id: lead.sellerId } });
      if (seller?.email) {
        await this.mail.send({
          to: seller.email,
          subject: `Заявка на ваш товар — VetGlobal`,
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
      subject: `Новая ветконсультация: ${c.topic} — VetGlobal`,
      html: layout(
        'Новая ветконсультация',
        `<table style="width:100%;border-collapse:collapse;font-size:14px;margin:12px 0">
          <tr><td style="padding:4px 0;color:#94a3b8">Клиент</td><td style="color:#0f172a">${c.fullName} (${c.phone})</td></tr>
          <tr><td style="padding:4px 0;color:#94a3b8">Тема</td><td style="color:#0f172a">${c.topic}</td></tr>
          <tr><td style="padding:4px 0;color:#94a3b8">Вопрос</td><td style="color:#0f172a">${c.message}</td></tr>
        </table>`,
      ),
    });
  }

  async onOrderStatusChanged(orderId: string, status: OrderStatus): Promise<void> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return;
    const shortId = order.id.slice(0, 8);

    // SMS to the buyer's phone (transactional — ТЗ 3.4 / SRS).
    if (order.buyerPhone) {
      await this.sms.send(order.buyerPhone, `VetGlobal: заказ #${shortId} — ${STATUS_RU[status]}`);
    }

    // Email (only for registered buyers with an email).
    if (order.buyerId) {
      const buyer = await this.prisma.user.findUnique({ where: { id: order.buyerId } });
      if (buyer?.email) {
        await this.mail.send({
          to: buyer.email,
          subject: `Заказ #${shortId}: ${STATUS_RU[status]} — VetGlobal`,
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
