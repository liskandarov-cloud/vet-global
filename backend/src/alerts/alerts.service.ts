import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { frontendUrl } from '../common/frontend-url';
import { Alert, Lang, textIn } from './text';
import { channelPost, telegramMessage } from './telegram-message';

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

  async notifyMany(userIds: string[], alert: Alert, opts: { telegram?: boolean } = {}) {
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
    if (opts.telegram !== false) void this.telegramUsers(ids, alert).catch(() => undefined);
  }

  // Тем, кто привязал Telegram в кабинете. Push на iPhone приходит только с
  // сайта, установленного на экран «Домой», а Telegram есть у всех.
  private async telegramUsers(ids: string[], alert: Alert) {
    if (!this.config.get<string>('TELEGRAM_BOT_TOKEN')) return;
    const linked = await this.prisma.user.findMany({
      where: { id: { in: ids }, telegramChatId: { not: null } },
      select: { id: true, telegramChatId: true, telegramLang: true },
    });
    for (const u of linked) {
      const code = await this.telegramSend(u.telegramChatId!, telegramMessage(alert, u.telegramLang === 'uz' ? 'uz' : 'ru', frontendUrl()));
      // Бот заблокирован или чат удалён — отвязываем, чтобы не стучаться впустую.
      if (code === 403) {
        await this.prisma.user.updateMany({ where: { id: u.id }, data: { telegramChatId: null } });
      }
    }
  }

  // Только в личный Telegram, без центра уведомлений и push: для секретов
  // (ссылка сброса пароля — в базе лежит лишь её хеш, копия в уведомлениях
  // сделала бы его бессмысленным).
  async telegramOnly(userId: string, alert: Alert): Promise<boolean> {
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { telegramChatId: true, telegramLang: true } });
    if (!u?.telegramChatId) return false;
    return (await this.telegramSend(u.telegramChatId, telegramMessage(alert, u.telegramLang === 'uz' ? 'uz' : 'ru', ''))) === 200;
  }

  // Публичный канал площадки (TELEGRAM_CHANNEL): новые товары и акции.
  // Фото — по ссылке; если Telegram его не взял, пост уходит текстом.
  async postToChannel(post: Alert & { image?: string }) {
    const channel = this.config.get<string>('TELEGRAM_CHANNEL');
    if (!channel) return;
    const { text, ...rest } = channelPost(post, frontendUrl());
    if (post.image?.startsWith('https://') && (await this.telegramCall('sendPhoto', { chat_id: channel, photo: post.image, caption: text, ...rest })) === 200) return;
    await this.telegramCall('sendMessage', { chat_id: channel, text, disable_web_page_preview: true, ...rest });
  }

  private telegramSend(chatId: string, message: object): Promise<number> {
    return this.telegramCall('sendMessage', { chat_id: chatId, ...message });
  }

  private async telegramCall(method: string, body: object): Promise<number> {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) return 0;
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok && res.status !== 403) this.logger.warn(`Telegram: ${res.status} ${(await res.text()).slice(0, 200)}`);
      return res.status;
    } catch (e) {
      this.logger.warn(`Telegram недоступен: ${(e as Error).message}`);
      return 0;
    }
  }

  // Имя бота для ссылки привязки — у самого Telegram, один раз за запуск.
  private botName?: Promise<string | null>;
  botUsername(): Promise<string | null> {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) return Promise.resolve(null);
    this.botName ??= fetch(`https://api.telegram.org/bot${token}/getMe`, { signal: AbortSignal.timeout(10_000) })
      .then((r) => r.json())
      .then((d: any) => (d?.ok ? (d.result.username as string) : null))
      .catch(() => null)
      .then((name) => {
        if (!name) this.botName = undefined; // сбой не запоминаем
        return name;
      });
    return this.botName;
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
    // В Telegram команде — одним сообщением в общий чат, а не каждому лично.
    await this.notifyMany(admins.map((a) => a.id), alert, { telegram: false });
    await this.telegramAdmins(alert);
  }

  // Отдельно от бота: бот может быть выключен, а сообщение в чат — это один
  // HTTP-запрос с тем же токеном.
  private async telegramAdmins(alert: Alert) {
    const chatId = this.config.get<string>('TELEGRAM_ADMIN_CHAT_ID');
    if (!chatId) return;
    await this.telegramSend(chatId, telegramMessage(alert, 'ru', frontendUrl()));
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
