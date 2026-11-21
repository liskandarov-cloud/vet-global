import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreditStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ApplyCreditDto, DecideCreditDto } from './dto/financing.dto';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { AlertsService } from '../alerts/alerts.service';
import { fmt, tt } from '../alerts/text';

@Injectable()
export class FinancingService {
  private readonly logger = new Logger(FinancingService.name);
  private readonly mode: string; // 'manual' (по умолчанию) | 'mock' (демо)
  private readonly maxLimit: number;
  private readonly bankName: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly alerts: AlertsService,
  ) {
    // По умолчанию — ручное решение.
    //
    // Раньше умолчанием был mock, а переменная не задавалась нигде: ни в
    // render.yaml, ни в compose. То есть на боевом контуре любой
    // зарегистрированный покупатель мгновенно выдавал себе кредитный лимит до
    // 100 млн сум и забирал товар по отсрочке, ничего не заплатив. Демо-режим
    // должен включаться намеренно, а не доставаться по умолчанию.
    this.mode = (config.get('FINANCING_MODE') ?? 'manual').toLowerCase();
    this.maxLimit = Number(config.get('FINANCING_MAX_LIMIT') ?? 100_000_000);
    this.bankName = config.get('FINANCING_BANK_NAME') ?? 'Банк-партнёр VetHub';
  }

  // Покупатель подаёт заявку. В mock-режиме — мгновенный скоринг и авто-решение.
  async apply(dto: ApplyCreditDto, user: AuthUser) {
    // Заявка от имени юрлица — только своего: решение о лимите принимается по
    // его ИНН, и чужое юрлицо в заявке это кредит под чужую компанию.
    if (dto.counterpartyId) {
      const own = await this.prisma.counterparty.findFirst({
        where: { id: dto.counterpartyId, userId: user.id },
        select: { id: true },
      });
      if (!own) throw new BadRequestException('Юрлицо не найдено среди ваших');
    }
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
      this.logger.warn(
        `FINANCING_MODE=mock — заявка ${app.id} одобряется автоматически. Допустимо только для демонстраций.`,
      );
      // Мгновенный скоринг: одобряем до maxLimit.
      const approved = Math.min(dto.requestedLimit, this.maxLimit);
      return this.decide(app.id, { approve: true, approvedLimit: approved, note: 'Авто-скоринг (демо)' });
    }
    // Решение принимает администратор — без сигнала заявка ждала, пока он
    // сам заглянет в раздел.
    void this.alerts
      .notifyAdmins({
        title: tt('Заявка на кредитный лимит', 'Kredit limiti uchun ariza'),
        body: tt(`${user.fullName}: ${fmt(dto.requestedLimit)} сум`, `${user.fullName}: ${fmt(dto.requestedLimit)} soʻm`),
        url: '/admin',
      })
      .catch(() => undefined);
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
      // Условием на статус: одновременные «одобрить» и «отклонить» оба проходили
      // проверку выше — заявка оставалась отклонённой, а лимит уже выдан.
      const claimed = await tx.creditApplication.updateMany({
        where: { id, status: CreditStatus.PENDING },
        data: { status: dto.approve ? CreditStatus.APPROVED : CreditStatus.REJECTED },
      });
      if (!claimed.count) throw new BadRequestException('Заявка уже обработана');
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
    void this.alerts.notify(
      app.buyerId,
      approvedLimit != null
        ? {
            title: tt('Кредитный лимит одобрен', 'Kredit limiti maʼqullandi'),
            body: tt(
              `Лимит ${fmt(approvedLimit)} сум — можно оформлять заказы с отсрочкой оплаты.`,
              `Limit ${fmt(approvedLimit)} soʻm — toʻlovni kechiktirib buyurtma berish mumkin.`,
            ),
            url: '/financing',
          }
        : {
            title: tt('Заявка на кредит отклонена', 'Kredit arizasi rad etildi'),
            body: tt(`Банк не одобрил заявку.${dto.note ? ` ${dto.note}` : ''}`, `Bank arizani maʼqullamadi.${dto.note ? ` ${dto.note}` : ''}`),
            url: '/financing',
          },
    );
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
