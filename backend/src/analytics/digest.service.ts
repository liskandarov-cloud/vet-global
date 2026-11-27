import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { OrderStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AlertsService } from '../alerts/alerts.service';
import { frontendUrl } from '../common/frontend-url';
import { digestText, yesterdayWindow } from './daily-digest';

@Injectable()
export class DigestService {
  private readonly logger = new Logger(DigestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly alerts: AlertsService,
  ) {}

  @Cron('0 9 * * *', { name: 'daily-digest', timeZone: 'Asia/Tashkent' })
  async send(now = new Date()) {
    const { from, to, label } = yesterdayWindow(now);
    const created = { gte: from, lt: to };
    const [orders, buyers, sellers, leads, consults, pendingSellers] = await Promise.all([
      this.prisma.order.aggregate({ where: { createdAt: created, status: { not: OrderStatus.CANCELLED } }, _count: true, _sum: { total: true } }),
      this.prisma.user.count({ where: { createdAt: created, role: UserRole.BUYER } }),
      this.prisma.user.count({ where: { createdAt: created, role: UserRole.SELLER } }),
      this.prisma.lead.count({ where: { createdAt: created } }),
      this.prisma.consultRequest.count({ where: { createdAt: created } }),
      this.prisma.user.count({ where: { role: UserRole.SELLER, isVerified: false, isBanned: false } }),
    ]);
    const text = digestText(
      { orders: orders._count, revenue: Number(orders._sum.total ?? 0), buyers, sellers, leads, consults, pendingSellers },
      label,
      frontendUrl(),
    );
    await this.alerts.teamTelegram(text);
    this.logger.log(`сводка за ${label} отправлена`);
  }
}
