import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { isPushEndpointAllowed } from './endpoint';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/decorators/current-user.decorator';

// Ключи VAPID — только из окружения. Раньше в коде лежала пара «по умолчанию»,
// и прод работал на ней: закрытый ключ был в публичном репозитории, и любой
// мог слать push от имени площадки. На проде ключи задаёт workflow
// «Rotate VAPID keys»; вне прода без ключей пара генерируется при старте
// (подписки живут до перезапуска — для разработки этого достаточно).

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly publicKey: string;
  private enabled = false;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    let publicKey: string | undefined = config.get('VAPID_PUBLIC_KEY');
    let privateKey: string | undefined = config.get('VAPID_PRIVATE_KEY');
    if ((!publicKey || !privateKey) && config.get('NODE_ENV') !== 'production') {
      ({ publicKey, privateKey } = webpush.generateVAPIDKeys());
    }
    this.publicKey = publicKey ?? '';
    const subject = config.get('VAPID_SUBJECT') ?? 'mailto:info@vethub.uz';
    if (publicKey && privateKey) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.enabled = true;
    } else {
      this.logger.warn('VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY не заданы — push выключен');
    }
  }

  getPublicKey() {
    return { publicKey: this.enabled ? this.publicKey : null };
  }

  async subscribe(
    sub: { endpoint: string; keys: { p256dh: string; auth: string } },
    user: AuthUser,
  ) {
    if (!sub?.endpoint || !sub.keys) return { ok: false };
    // Сервер сам шлёт POST на этот адрес — только сервисы уведомлений браузеров.
    if (!isPushEndpointAllowed(sub.endpoint)) {
      throw new BadRequestException('Неподдерживаемый адрес push-подписки');
    }
    await this.prisma.pushSubscription.upsert({
      where: { endpoint: sub.endpoint },
      create: { userId: user.id, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
      update: { userId: user.id, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    });
    return { ok: true };
  }

  async unsubscribe(endpoint: string, user: AuthUser) {
    await this.prisma.pushSubscription.deleteMany({ where: { endpoint, userId: user.id } });
    return { ok: true };
  }

  // Отправка уведомления всем устройствам пользователя (fire-and-forget).
  async sendToUser(userId: string, payload: PushPayload) {
    if (!this.enabled) return;
    const subs = await this.prisma.pushSubscription.findMany({ where: { userId } });
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify(payload),
          );
        } catch (e: any) {
          // Просроченная/отозванная подписка — удаляем.
          if (e?.statusCode === 404 || e?.statusCode === 410) {
            await this.prisma.pushSubscription.delete({ where: { endpoint: s.endpoint } }).catch(() => undefined);
          } else {
            this.logger.warn(`push fail: ${e?.message ?? e}`);
          }
        }
      }),
    );
  }
}
