import { Injectable } from '@nestjs/common';
import { LeadSource, LeadStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../mail/notifications.service';

export interface CreateLeadInput {
  source?: LeadSource;
  fullName: string;
  phone: string;
  message?: string;
  productId?: string;
  productName?: string;
  sellerId?: string;
  quantity?: number;
}

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(input: CreateLeadInput) {
    // Enrich from product if only productId is provided.
    let productName = input.productName;
    let sellerId = input.sellerId;
    if (input.productId && (!productName || !sellerId)) {
      const p = await this.prisma.product.findUnique({ where: { id: input.productId } });
      if (p) {
        productName = productName ?? p.name;
        sellerId = sellerId ?? p.sellerId;
      }
    }

    const lead = await this.prisma.lead.create({
      data: {
        source: input.source ?? LeadSource.WEB,
        fullName: input.fullName,
        phone: input.phone,
        message: input.message,
        productId: input.productId,
        productName,
        sellerId,
        quantity: input.quantity,
      },
    });

    void this.notifications.onLeadCreated(lead.id).catch(() => undefined);
    return lead;
  }

  async list(status?: LeadStatus) {
    return this.prisma.lead.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async update(id: string, data: { status?: LeadStatus; note?: string }) {
    return this.prisma.lead.update({ where: { id }, data });
  }

  countNew() {
    return this.prisma.lead.count({ where: { status: LeadStatus.NEW } });
  }
}
