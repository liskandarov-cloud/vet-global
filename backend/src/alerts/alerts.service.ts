import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { frontendUrl } from '../common/frontend-url';
import { Alert, Lang, textIn } from './text';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
    private readonly config: ConfigService,
  ) {}

  // Единая точка: уведомление в центр на сайте + web-push на устройства.
  async notify(userId: string, alert: Alert) {
    await this.notifyMany([userId], alert);
  }

  async notifyMany(userIds: string[], alert: Alert) {
    const ids = [...new Set(userIds.filter(Boolean))];
    if (!ids.length) return;
    await this.prisma.notification
      .createMany({
        data: ids.map((userId) => ({
          userId,
          title: textIn(alert.title, 'ru'),
          body: textIn(alert.body, 'ru'),
          titleUz: textIn(alert.title, 'uz'),
          bodyUz: textIn(alert.body, 'uz'),
          url: alert.url ?? null,
        })),
      })
      .catch((e) => this.logger.warn(`уведомление не сохранено: ${(e as Error).message}`));
    for (const id of ids) {
      void this.push.sendToUser(id, (lang) => ({ title: textIn(alert.title, lang), body: textIn(alert.body, lang), url: alert.url }));
    }
  }

  // Продавцам заказа (кроме того, кто сам совершил действие).
  async notifyOrderSellers(orderId: string, alert: Alert, exceptUserId?: string) {
    const items = await this.prisma.orderItem.findMany({ where: { orderId }, select: { sellerId: true } });
    await this.notifyMany(
      items.map((i) => i.sellerId).filter((id): id is string => !!id && id !== exceptUserId),
      alert,
    );
  }

  // Команде площадки: администраторам на сайте и в Telegram-чат.
  //
  // Раньше админ узнавал о заказах, заявках и новых продавцах только письмом на
  // ADMIN_EMAIL, а без почтового провайдера письма не уходили вовсе.
  async notifyAdmins(alert: Alert) {
    const admins = await this.prisma.user.findMany({
      where: { role: UserRole.ADMIN, isBanned: false },
      select: { id: true },
    });
    await this.notifyMany(admins.map((a) => a.id), alert);
    await this.telegramAdmins(alert);
  }

  // Отдельно от бота: бот может быть выключен, а сообщение в чат — это один
  // HTTP-запрос с тем же токеном.
  private async telegramAdmins(alert: Alert) {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    const chatId = this.config.get<string>('TELEGRAM_ADMIN_CHAT_ID');
    if (!token || !chatId) return;
    const link = alert.url ? `\n${frontendUrl()}${alert.url}` : '';
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `${textIn(alert.title, 'ru')}\n${textIn(alert.body, 'ru')}${link}`,
          disable_web_page_preview: true,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) this.logger.warn(`Telegram: ${res.status} ${(await res.text()).slice(0, 200)}`);
    } catch (e) {
      this.logger.warn(`Telegram недоступен: ${(e as Error).message}`);
    }
  }

  async list(user: AuthUser, lang: Lang = 'ru') {
    const [items, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      this.prisma.notification.count({ where: { userId: user.id, read: false } }),
    ]);
    return {
      items: items.map(({ titleUz, bodyUz, ...n }) =>
        lang === 'uz' ? { ...n, title: titleUz || n.title, body: bodyUz || n.body } : n,
      ),
      unread,
    };
  }

  async markRead(id: string, user: AuthUser) {
    await this.prisma.notification.updateMany({ where: { id, userId: user.id }, data: { read: true } });
    return { ok: true };
  }

  async markAllRead(user: AuthUser) {
    await this.prisma.notification.updateMany({ where: { userId: user.id, read: false }, data: { read: true } });
    return { ok: true };
  }
}
