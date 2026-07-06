import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PushService, PushPayload } from '../push/push.service';
import { AuthUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class AlertsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
  ) {}

  // Единая точка: сохраняем уведомление в центр + отправляем web-push.
  async notify(userId: string, payload: PushPayload) {
    await this.prisma.notification
      .create({ data: { userId, title: payload.title, body: payload.body, url: payload.url ?? null } })
      .catch(() => undefined);
    void this.push.sendToUser(userId, payload);
  }

  async list(user: AuthUser) {
    const [items, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      this.prisma.notification.count({ where: { userId: user.id, read: false } }),
    ]);
    return { items, unread };
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
