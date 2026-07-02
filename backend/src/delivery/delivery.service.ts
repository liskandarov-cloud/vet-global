import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DeliveryMethod, ShipmentStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { SmsService } from '../sms/sms.service';

const SHIP_RU: Record<ShipmentStatus, string> = {
  PENDING: 'ожидает отгрузки',
  ASSIGNED: 'назначен перевозчик',
  IN_TRANSIT: 'в пути',
  DELIVERED: 'доставлено',
  RETURNED: 'возврат',
};

export interface ShipmentDto {
  method?: DeliveryMethod;
  status?: ShipmentStatus;
  city?: string;
  address?: string;
  recipientName?: string;
  recipientPhone?: string;
  cost?: number;
  carrier?: string;
  trackingNumber?: string;
  estimatedDate?: string;
}

@Injectable()
export class DeliveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sms: SmsService,
  ) {}

  async upsert(orderId: string, dto: ShipmentDto, user: AuthUser) {
    await this.assertOrderAccess(orderId, user, true);
    const data = {
      method: dto.method,
      status: dto.status,
      city: dto.city,
      address: dto.address,
      recipientName: dto.recipientName,
      recipientPhone: dto.recipientPhone,
      cost: dto.cost,
      carrier: dto.carrier,
      trackingNumber: dto.trackingNumber,
      estimatedDate: dto.estimatedDate ? new Date(dto.estimatedDate) : undefined,
    };
    const shipment = await this.prisma.shipment.upsert({
      where: { orderId },
      update: data,
      create: { orderId, ...data },
    });
    return this.serialize(shipment);
  }

  async get(orderId: string, user: AuthUser) {
    await this.assertOrderAccess(orderId, user, false);
    const shipment = await this.prisma.shipment.findUnique({ where: { orderId } });
    return shipment ? this.serialize(shipment) : null;
  }

  async setStatus(orderId: string, status: ShipmentStatus, user: AuthUser) {
    await this.assertOrderAccess(orderId, user, true);
    const existing = await this.prisma.shipment.findUnique({ where: { orderId } });
    if (!existing) throw new NotFoundException('Shipment not found');
    const shipment = await this.prisma.shipment.update({ where: { orderId }, data: { status } });

    // Notify buyer of the logistics change by SMS (ТЗ 3.4).
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (order?.buyerPhone) {
      void this.sms
        .send(order.buyerPhone, `VetGlobal: доставка заказа #${orderId.slice(0, 8)} — ${SHIP_RU[status]}`)
        .catch(() => undefined);
    }
    return this.serialize(shipment);
  }

  private async assertOrderAccess(orderId: string, user: AuthUser, mutate: boolean) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) throw new NotFoundException('Order not found');
    if (user.role === UserRole.ADMIN) return;
    const isSeller = order.items.some((it) => it.sellerId === user.id);
    if (mutate) {
      if (!isSeller) throw new ForbiddenException('Not authorized');
    } else {
      const isBuyer = order.buyerId === user.id;
      if (!isSeller && !isBuyer) throw new ForbiddenException('Not authorized');
    }
  }

  private serialize(s: any) {
    return { ...s, cost: Number(s.cost) };
  }
}
