import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Полная очистка демо/операционных данных. Сохраняются: категории (таксономия)
  // и учётные записи администраторов. Требуется точная фраза подтверждения.
  async reset(confirm: string) {
    if (confirm !== 'RESET_DEMO_DATA') {
      throw new BadRequestException('Подтверждение неверно. Ожидается confirm="RESET_DEMO_DATA".');
    }

    // Порядок важен для внешних ключей: сначала зависимые/операционные, затем ядро.
    await this.prisma.$transaction([
      this.prisma.notification.deleteMany(),
      this.prisma.pushSubscription.deleteMany(),
      this.prisma.vetPointsTransaction.deleteMany(),
      this.prisma.favorite.deleteMany(),
      this.prisma.payment.deleteMany(),
      this.prisma.shipment.deleteMany(),
      this.prisma.invoice.deleteMany(),
      this.prisma.rfqQuote.deleteMany(),
      this.prisma.rfqItem.deleteMany(),
      this.prisma.rfq.deleteMany(),
      this.prisma.creditApplication.deleteMany(),
      this.prisma.orgMembership.deleteMany(),
      this.prisma.organization.deleteMany(),
      this.prisma.contractPrice.deleteMany(),
      this.prisma.subscription.deleteMany(),
      this.prisma.promotion.deleteMany(),
      this.prisma.lead.deleteMany(),
      this.prisma.consultRequest.deleteMany(),
      this.prisma.review.deleteMany(),
      this.prisma.counterparty.deleteMany(),
      this.prisma.orderItem.deleteMany(),
      this.prisma.order.deleteMany(),
      this.prisma.offer.deleteMany(),
      this.prisma.product.deleteMany(),
      this.prisma.brand.deleteMany(),
      this.prisma.sellerDocument.deleteMany(),
      this.prisma.blogPost.deleteMany(),
      // Все пользователи, КРОМЕ администраторов.
      this.prisma.user.deleteMany({ where: { NOT: { role: UserRole.ADMIN } } }),
    ]);

    const [categories, admins, products, users] = await Promise.all([
      this.prisma.category.count(),
      this.prisma.user.count({ where: { role: UserRole.ADMIN } }),
      this.prisma.product.count(),
      this.prisma.user.count(),
    ]);

    this.logger.warn(`DB reset выполнен. Осталось: категорий ${categories}, админов ${admins}.`);
    return { ok: true, kept: { categories, admins }, remaining: { products, users } };
  }
}
