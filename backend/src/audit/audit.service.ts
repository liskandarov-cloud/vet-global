import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { redact } from './redact';

export interface AuditEntry {
  adminId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  details?: unknown;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Действие уже выполнено; если запись в журнал не удалась, само действие не
  // откатываем, но громко пишем в лог — по нему пропуск можно восстановить.
  async record(e: AuditEntry): Promise<void> {
    try {
      await this.prisma.adminAuditLog.create({
        data: {
          adminId: e.adminId,
          action: e.action,
          targetType: e.targetType,
          targetId: e.targetId ?? null,
          details: (redact(e.details) ?? undefined) as Prisma.InputJsonValue | undefined,
        },
      });
    } catch (err) {
      this.logger.error(`audit write failed: ${e.action} ${e.targetType}/${e.targetId} by ${e.adminId}: ${(err as Error).message}`);
    }
  }

  async list(q: { targetType?: string; targetId?: string; limit?: number; before?: string }) {
    const take = Math.min(Math.max(Number(q.limit) || 50, 1), 200);
    const entries = await this.prisma.adminAuditLog.findMany({
      where: {
        ...(q.targetType ? { targetType: q.targetType } : {}),
        ...(q.targetId ? { targetId: q.targetId } : {}),
        ...(q.before ? { createdAt: { lt: new Date(q.before) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take,
      include: { admin: { select: { email: true, fullName: true } } },
    });
    return { entries };
  }
}
