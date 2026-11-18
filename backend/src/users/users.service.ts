import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { sellerIdentityChanged } from '../common/reverify';
import { ChangePasswordDto, CounterpartyDto, SellerDocumentDto, UpdateProfileDto } from './dto/user.dto';
import { anonymizedProfile, deletionBlocker } from './account-deletion';
import { randomBytes } from 'crypto';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { PUBLIC_PRODUCT, SELLABLE_SELLER } from '../common/visibility';
import { recalcSellerProducts } from '../offers/product-aggregates';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  // ── Profile ──
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const prev = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true, isVerified: true, company: true, inn: true } });
    // Проверенный продавец, сменивший название или ИНН, проходит проверку
    // заново: администратор проверял другую компанию.
    const reverify = prev?.role === UserRole.SELLER && prev.isVerified && sellerIdentityChanged(prev, dto);
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: reverify ? { ...dto, isVerified: false } : dto,
    });
    return this.sanitize(user);
  }

  // Смена пароля: требует текущий пароль — чтобы чужая открытая сессия
  // не могла сменить его без подтверждения владельца.
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const ok = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!ok) throw new BadRequestException('Текущий пароль неверен');
    if (dto.newPassword.length < 8) throw new BadRequestException('Новый пароль слишком короткий');
    // Остальные сеансы (другие устройства) отзываются; текущий фронтенд
    // сразу входит заново с новым паролем.
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(dto.newPassword, 10), passwordChangedAt: new Date() },
    });
    return { ok: true };
  }

  // Удаление аккаунта владельцем — обезличивание (см. account-deletion.ts).
  async deleteSelf(userId: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) throw new NotFoundException('User not found');
    if (!(await bcrypt.compare(password, user.passwordHash))) throw new BadRequestException('Пароль неверен');

    const active = [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PROCESSING, OrderStatus.SHIPPED];
    const [activeBuyerOrders, activeSellerOrders, ownedOrgs] = await Promise.all([
      this.prisma.order.count({ where: { buyerId: userId, status: { in: active } } }),
      this.prisma.order.count({ where: { status: { in: active }, items: { some: { sellerId: userId } } } }),
      this.prisma.orgMembership.findMany({ where: { userId, role: 'OWNER', acceptedAt: { not: null } }, select: { orgId: true } }),
    ]);
    const othersInOwnedOrgs = ownedOrgs.length
      ? await this.prisma.orgMembership.count({ where: { orgId: { in: ownedOrgs.map((o) => o.orgId) }, userId: { not: userId }, acceptedAt: { not: null } } })
      : 0;
    const blocker = deletionBlocker({
      role: user.role,
      activeBuyerOrders,
      activeSellerOrders,
      creditUsed: Number(user.creditUsed),
      ownsOrgWithOthers: othersInOwnedOrgs > 0,
    });
    if (blocker) throw new ConflictException(blocker);

    const now = new Date();
    const docFiles = await this.prisma.sellerDocument.findMany({ where: { sellerId: userId }, select: { fileUrl: true } });
    await this.prisma.$transaction([
      // Юрлица, по которым есть заказы, остаются: на них выписаны счета, и
      // хранить их требует закон. Остальные удаляются.
      this.prisma.counterparty.deleteMany({ where: { userId, orders: { none: {} } } }),
      this.prisma.consultRequest.deleteMany({ where: { userId } }),
      // Заявки (лиды) не привязаны к учётной записи — находятся по телефону.
      ...(user.phone ? [this.prisma.lead.deleteMany({ where: { phone: user.phone } })] : []),
      this.prisma.user.update({
        where: { id: userId },
        data: {
          ...anonymizedProfile(userId),
          // Пароль, который никто не знает, и отзыв всех выданных входов.
          passwordHash: await bcrypt.hash(randomBytes(32).toString('hex'), 10),
          passwordChangedAt: now,
          isBanned: true,
          isVerified: false,
          deletedAt: now,
        },
      }),
      this.prisma.passwordResetToken.deleteMany({ where: { userId } }),
      this.prisma.pushSubscription.deleteMany({ where: { userId } }),
      this.prisma.notification.deleteMany({ where: { userId } }),
      this.prisma.favorite.deleteMany({ where: { userId } }),
      this.prisma.stockAlert.deleteMany({ where: { userId } }),
      this.prisma.orgMembership.deleteMany({ where: { userId } }),
      this.prisma.subscription.deleteMany({ where: { buyerId: userId } }),
      this.prisma.contractPrice.deleteMany({ where: { OR: [{ sellerId: userId }, { buyerId: userId }] } }),
      this.prisma.deliveryTariff.deleteMany({ where: { sellerId: userId } }),
      this.prisma.sellerDocument.deleteMany({ where: { sellerId: userId } }),
      this.prisma.rfq.updateMany({ where: { buyerId: userId, status: 'OPEN' }, data: { status: 'CLOSED' } }),
      // Отзывы остаются — они о товаре, а не о человеке; имя снимается.
      this.prisma.review.updateMany({ where: { buyerId: userId }, data: { buyerName: 'Покупатель' } }),
      this.prisma.product.updateMany({ where: { sellerId: userId }, data: { isActive: false } }),
      this.prisma.offer.updateMany({ where: { sellerId: userId }, data: { isActive: false } }),
      this.prisma.promotion.updateMany({ where: { sellerId: userId }, data: { isActive: false } }),
    ]);
    await Promise.all(docFiles.map((d) => this.storage.removeDbFile(d.fileUrl)));
    await recalcSellerProducts(this.prisma, userId);
    return { ok: true };
  }

  // ── Counterparties (buyer legal entities) ──
  async listCounterparties(userId: string) {
    return this.prisma.counterparty.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addCounterparty(userId: string, dto: CounterpartyDto) {
    if (dto.isDefault) {
      await this.prisma.counterparty.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    return this.prisma.counterparty.create({ data: { ...dto, userId } });
  }

  async updateCounterparty(userId: string, id: string, dto: CounterpartyDto) {
    const cp = await this.prisma.counterparty.findUnique({ where: { id } });
    if (!cp || cp.userId !== userId) throw new NotFoundException('Counterparty not found');
    if (dto.isDefault) {
      await this.prisma.counterparty.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    return this.prisma.counterparty.update({ where: { id }, data: dto });
  }

  async deleteCounterparty(userId: string, id: string) {
    const cp = await this.prisma.counterparty.findUnique({ where: { id } });
    if (!cp || cp.userId !== userId) throw new NotFoundException('Counterparty not found');
    await this.prisma.counterparty.delete({ where: { id } });
    return { message: 'Deleted' };
  }

  // ── Sellers (public) ──
  // В публичном каталоге поставщиков — только те, кому можно продавать (см.
  // common/visibility). Непроверенный продавец показывался бы с нулём товаров,
  // заблокированный — со всеми, хотя ни у того, ни у другого заказать нельзя.
  // Параметр verifiedOnly остаётся ради совместимости со старыми ссылками.
  async listSellers(_verifiedOnly = false) {
    const sellers = await this.prisma.user.findMany({
      where: { role: UserRole.SELLER, ...SELLABLE_SELLER },
      orderBy: { rating: 'desc' },
    });
    return Promise.all(sellers.map((s) => this.sellerCard(s)));
  }

  async getSeller(id: string) {
    const seller = await this.prisma.user.findFirst({
      where: { id, role: UserRole.SELLER, ...SELLABLE_SELLER },
    });
    if (!seller) throw new NotFoundException('Seller not found');
    return this.sellerCard(seller);
  }

  private async sellerCard(s: any) {
    const productsCount = await this.prisma.product.count({ where: { sellerId: s.id, ...PUBLIC_PRODUCT } });
    return {
      id: s.id,
      company: s.company,
      fullName: s.fullName,
      description: s.description,
      logoUrl: s.logoUrl,
      isVerified: s.isVerified,
      isDemo: s.isDemo,
      rating: Number(s.rating),
      reviewsCount: s.reviewsCount,
      productsCount,
      createdAt: s.createdAt,
    };
  }

  // ── Seller documents (licenses/certs for moderation) ──
  // Документ — только файл, загруженный через платформу (см. storage/own-url.ts):
  // его открывает администратор, и внешняя ссылка здесь — ссылка, по которой
  // он перейдёт сам.
  async addSellerDocument(sellerId: string, dto: SellerDocumentDto) {
    if (!this.storage.isOwnUrl(dto.fileUrl)) {
      throw new BadRequestException('Документ загружается файлом через платформу, а не ссылкой');
    }
    const title = String(dto.title ?? '').trim().slice(0, 200) || 'Документ';
    return this.prisma.sellerDocument.create({ data: { title, fileUrl: dto.fileUrl, sellerId } });
  }

  // Файл документа продавца — владельцу и администратору. Чужому — 404, а не
  // 403: не подтверждаем, что такой документ существует.
  async sellerDocumentFile(docId: string, user: AuthUser) {
    const doc = await this.prisma.sellerDocument.findUnique({ where: { id: docId } });
    if (!doc || (user.role !== UserRole.ADMIN && doc.sellerId !== user.id)) {
      throw new NotFoundException('Документ не найден');
    }
    return { doc, file: await this.storage.readDbFile(doc.fileUrl) };
  }

  async listSellerDocuments(sellerId: string) {
    return this.prisma.sellerDocument.findMany({ where: { sellerId }, orderBy: { createdAt: 'desc' } });
  }

  // ── Admin: user management ──
  async adminListUsers(role?: UserRole, skip = 0, take = 50) {
    const [total, users] = await this.prisma.$transaction([
      this.prisma.user.count({ where: role ? { role } : {} }),
      this.prisma.user.findMany({
        where: role ? { role } : {},
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: { _count: { select: { sellerLicenses: true } } },
      }),
    ]);
    return {
      total,
      users: users.map(({ _count, ...u }) => ({ ...this.sanitize(u), documentsCount: _count.sellerLicenses })),
    };
  }

  // Проверка и блокировка открывают или закрывают продавцу витрину, а с ней
  // и цены на карточках, где у него есть предложения — их пересчитываем сразу.
  async adminVerify(userId: string, isVerified: boolean) {
    const user = await this.prisma.user.update({ where: { id: userId }, data: { isVerified } });
    // Проверка продавца — это проверка его документов: отметка у документов
    // раньше существовала, но не ставилась нигде, и продавец не видел, приняты ли они.
    await this.prisma.sellerDocument.updateMany({ where: { sellerId: userId }, data: { isApproved: isVerified } });
    await recalcSellerProducts(this.prisma, userId);
    return this.sanitize(user);
  }

  async adminBan(userId: string, isBanned: boolean) {
    const target = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!target) throw new NotFoundException('User not found');
    if (target.role === UserRole.ADMIN) throw new ForbiddenException('Cannot ban an admin');
    const user = await this.prisma.user.update({ where: { id: userId }, data: { isBanned } });
    await recalcSellerProducts(this.prisma, userId);
    return this.sanitize(user);
  }

  // Удаление пользователя. Ограничения те же, что у бана (админа не трогаем),
  // плюс запрет удалять самого себя — иначе можно остаться без администратора.
  async adminRemove(userId: string, me: AuthUser) {
    const target = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!target) throw new NotFoundException('User not found');
    if (target.id === me.id) throw new ForbiddenException('Cannot delete your own account');
    if (target.role === UserRole.ADMIN) throw new ForbiddenException('Cannot delete an admin');
    await this.prisma.user.delete({ where: { id: userId } });
    return { ok: true };
  }

  private sanitize(u: any) {
    const { passwordHash, ...rest } = u;
    return { ...rest, vetPointsBalance: Number(u.vetPointsBalance ?? 0), rating: Number(u.rating ?? 0) };
  }
}
