import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreditStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ApplyCreditDto, DecideCreditDto } from './dto/financing.dto';
import { AuthUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class FinancingService {
  private readonly mode: string; // 'mock' | 'manual'
  private readonly maxLimit: number;
  private readonly bankName: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.mode = config.get('FINANCING_MODE') ?? 'mock';
    this.maxLimit = Number(config.get('FINANCING_MAX_LIMIT') ?? 100_000_000);
    this.bankName = config.get('FINANCING_BANK_NAME') ?? 'Банк-партнёр VetGlobal';
  }

  // Покупатель подаёт заявку. В mock-режиме — мгновенный скоринг и авто-решение.
  async apply(dto: ApplyCreditDto, user: AuthUser) {
    const app = await this.prisma.creditApplication.create({
      data: {
        buyerId: user.id,
        counterpartyId: dto.counterpartyId ?? null,
        requestedLimit: dto.requestedLimit,
        purpose: dto.purpose ?? null,
        status: CreditStatus.PENDING,
        bankName: this.bankName,
      },
    });

    if (this.mode === 'mock') {
      // Мгновенный скоринг: одобряем до maxLimit.
      const approved = Math.min(dto.requestedLimit, this.maxLimit);
      return this.decide(app.id, { approve: true, approvedLimit: approved, note: 'Авто-скоринг (демо)' });
    }
    return app;
  }

  // Текущий лимит + история заявок покупателя.
  async myStatus(user: AuthUser) {
    const [u, applications] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: user.id },
        select: { creditLimit: true, creditUsed: true },
      }),
      this.prisma.creditApplication.findMany({
        where: { buyerId: user.id },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    const creditLimit = Number(u?.creditLimit ?? 0);
    const creditUsed = Number(u?.creditUsed ?? 0);
    return {
      creditLimit,
      creditUsed,
      available: Math.max(0, creditLimit - creditUsed),
      bankName: this.bankName,
      applications: applications.map(serializeApp),
    };
  }

  // Список заявок для админа.
  async list(status?: CreditStatus) {
    const apps = await this.prisma.creditApplication.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'desc' },
      include: { buyer: { select: { id: true, fullName: true, company: true, phone: true, email: true } } },
    });
    return apps.map(serializeApp);
  }

  // Решение по заявке (админ вручную, либо внутренний вызов mock-скоринга).
  async decide(id: string, dto: DecideCreditDto) {
    const app = await this.prisma.creditApplication.findUnique({ where: { id } });
    if (!app) throw new NotFoundException('Заявка не найдена');
    if (app.status !== CreditStatus.PENDING)
      throw new BadRequestException('Заявка уже обработана');

    const approvedLimit = dto.approve
      ? Math.min(dto.approvedLimit ?? Number(app.requestedLimit), this.maxLimit)
      : null;

    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.creditApplication.update({
        where: { id },
        data: {
          status: dto.approve ? CreditStatus.APPROVED : CreditStatus.REJECTED,
          approvedLimit,
          bankName: dto.bankName ?? app.bankName,
          decisionNote: dto.note ?? null,
          decidedAt: new Date(),
        },
      });
      if (dto.approve && approvedLimit != null) {
        // Устанавливаем лимит покупателю = наибольший из текущего и одобренного.
        const buyer = await tx.user.findUnique({ where: { id: app.buyerId }, select: { creditLimit: true } });
        const newLimit = Math.max(Number(buyer?.creditLimit ?? 0), approvedLimit);
        await tx.user.update({ where: { id: app.buyerId }, data: { creditLimit: newLimit } });
      }
      return u;
    });
    return serializeApp(updated);
  }
}

function serializeApp(a: any) {
  return {
    ...a,
    requestedLimit: Number(a.requestedLimit),
    approvedLimit: a.approvedLimit != null ? Number(a.approvedLimit) : null,
  };
}
