import { ForbiddenException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DeliveryMethod, ShipmentStatus, UserRole, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { SmsService } from '../sms/sms.service';
import { orderTotal } from '../common/pricing';

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
    const sellerId = await this.resolveSeller(orderId, user);
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
      where: { orderId_sellerId: { orderId, sellerId } },
      update: data,
      create: { orderId, sellerId, ...data },
    });

    await this.syncOrderTotal(orderId);
    return this.serialize(shipment);
  }

  // Возвращает все отправки заказа: у заказа от нескольких поставщиков их
  // столько же, сколько продавцов, и показывать покупателю одну из них значит
  // скрыть остальные посылки.
  async get(orderId: string, user: AuthUser) {
    await this.assertOrderAccess(orderId, user, false);
    const shipments = await this.prisma.shipment.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' },
    });
    return shipments.map((sh) => this.serialize(sh));
  }

  async setStatus(orderId: string, status: ShipmentStatus, user: AuthUser) {
    await this.assertOrderAccess(orderId, user, true);
    const sellerId = await this.resolveSeller(orderId, user);
    const existing = await this.prisma.shipment.findUnique({
      where: { orderId_sellerId: { orderId, sellerId } },
    });
    if (!existing) throw new NotFoundException('Shipment not found');
    const shipment = await this.prisma.shipment.update({
      where: { orderId_sellerId: { orderId, sellerId } },
      data: { status },
    });

    // Notify buyer of the logistics change by SMS (ТЗ 3.4).
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (order?.buyerPhone) {
      void this.sms
        .send(order.buyerPhone, `VetGlobal: доставка заказа #${orderId.slice(0, 8)} — ${SHIP_RU[status]}`)
        .catch(() => undefined);
    }
    return this.serialize(shipment);
  }

  // Сумма заказа включает доставку, поэтому при её назначении пересчитывается.
  //
  // Стоимость доставки задаёт продавец уже после создания заказа, а order.total —
  // это сумма к оплате: по ней создаётся платёж, её сверяет Payme, из неё
  // складываются счёт и документ ЭДО. Поэтому менять её задним числом можно
  // только пока заказ не оплачен и счёт не выставлен: иначе покупатель заплатил
  // одну сумму, а в документах оказалась другая.
  //
  // Прочие поля отправки (трек-номер, перевозчик) правятся свободно — проверка
  // срабатывает лишь когда меняется именно сумма.
  private async syncOrderTotal(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        subtotal: true,
        vetPointsUsed: true,
        total: true,
        invoice: { select: { id: true } },
        payments: { where: { status: PaymentStatus.PAID }, select: { id: true } },
        // Все отправки заказа: покупатель платит за доставку каждого поставщика.
        shipments: { select: { cost: true } },
      },
    });
    if (!order) return;

    const deliveryCost = order.shipments.reduce((sum, sh) => sum + Number(sh.cost), 0);
    const next = orderTotal(Number(order.subtotal), Number(order.vetPointsUsed), deliveryCost);
    if (next === Number(order.total)) return;

    if (order.payments.length || order.invoice) {
      const reason = order.payments.length ? 'заказ уже оплачен' : 'по заказу выставлен счёт';
      throw new BadRequestException(
        `Стоимость доставки нельзя изменить: ${reason}. Сумма к оплате осталась бы прежней, ` +
          'а документы разошлись бы с платежом.',
      );
    }

    await this.prisma.order.update({ where: { id: orderId }, data: { total: next } });
  }

  // Чью отправку правит вызывающий.
  //
  // Продавец — всегда свою: подставить чужой идентификатор он не может, потому
  // что берётся его собственный. Администратору достаётся первый продавец
  // заказа: он правит отправки как исключение, а выбирать конкретную ему пока
  // негде — интерфейса для этого нет, и придумывать параметр «за кого» до того,
  // как он понадобится, значит расширять API впустую.
  private async resolveSeller(orderId: string, user: AuthUser): Promise<string> {
    if (user.role !== UserRole.ADMIN) return user.id;
    const first = await this.prisma.orderItem.findFirst({
      where: { orderId },
      select: { sellerId: true },
      orderBy: { id: 'asc' },
    });
    if (!first) throw new NotFoundException('В заказе нет позиций');
    return first.sellerId;
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
