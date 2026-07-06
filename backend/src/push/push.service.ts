import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/decorators/current-user.decorator';

// Демо-VAPID (переопределяется env в проде). НЕ используйте эти ключи для реального прод-трафика.
const DEFAULT_PUBLIC = 'BPlLuiUv_OFThRAcPO2udhxl6FwgeFIYwurbwuBXViMDGdWiPNwBNX2_Sj1gvq_UtwZ5pAugi2Mqkaq4H8rCfSE';
const DEFAULT_PRIVATE = 'LYMF-KGBKICwWNdwpUjsY6Yz5AdCE3JYRgiyB0Q-zrQ';

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
    this.publicKey = config.get('VAPID_PUBLIC_KEY') ?? DEFAULT_PUBLIC;
    const privateKey = config.get('VAPID_PRIVATE_KEY') ?? DEFAULT_PRIVATE;
    const subject = config.get('VAPID_SUBJECT') ?? 'mailto:info@vetglobal.uz';
    if (this.publicKey && privateKey) {
      webpush.setVapidDetails(subject, this.publicKey, privateKey);
      this.enabled = true;
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
