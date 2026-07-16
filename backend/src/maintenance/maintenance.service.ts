import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

export interface ProvisionUserDto {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  company?: string;
  inn?: string;
  description?: string;
  role?: UserRole;
}

@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Провижининг учётной записи с заданной ролью (в т.ч. ADMIN).
  // Регистрация через /auth/register роль ADMIN не выдаёт — это админ-инструмент.
  async provisionUser(dto: ProvisionUserDto) {
    if (!dto.email || !dto.password || !dto.fullName) {
      throw new BadRequestException('Требуются email, password и fullName.');
    }
    if (dto.password.length < 8) {
      throw new BadRequestException('Пароль должен быть не короче 8 символов.');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const data = {
      passwordHash,
      fullName: dto.fullName,
      phone: dto.phone ?? '',
      company: dto.company ?? null,
      inn: dto.inn ?? null,
      description: dto.description ?? null,
      role: dto.role ?? UserRole.BUYER,
      isVerified: true,
      isBanned: false,
    };
    const user = await this.prisma.user.upsert({
      where: { email: dto.email },
      create: { email: dto.email, ...data },
      update: data,
    });
    this.logger.warn(`Provisioned user ${user.email} role=${user.role}`);
    return { id: user.id, email: user.email, role: user.role, fullName: user.fullName };
  }

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
