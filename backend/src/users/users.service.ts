import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CounterpartyDto, SellerDocumentDto, UpdateProfileDto } from './dto/user.dto';
import { AuthUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Profile ──
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({ where: { id: userId }, data: dto });
    return this.sanitize(user);
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
  async listSellers(verifiedOnly = false) {
    const sellers = await this.prisma.user.findMany({
      where: { role: UserRole.SELLER, ...(verifiedOnly ? { isVerified: true } : {}) },
      orderBy: { rating: 'desc' },
    });
    return Promise.all(sellers.map((s) => this.sellerCard(s)));
  }

  async getSeller(id: string) {
    const seller = await this.prisma.user.findFirst({ where: { id, role: UserRole.SELLER } });
    if (!seller) throw new NotFoundException('Seller not found');
    return this.sellerCard(seller);
  }

  private async sellerCard(s: any) {
    const productsCount = await this.prisma.product.count({ where: { sellerId: s.id } });
    return {
      id: s.id,
      company: s.company,
      fullName: s.fullName,
      description: s.description,
      logoUrl: s.logoUrl,
      isVerified: s.isVerified,
      rating: Number(s.rating),
      reviewsCount: s.reviewsCount,
      productsCount,
      createdAt: s.createdAt,
    };
  }

  // ── Seller documents (licenses/certs for moderation) ──
  async addSellerDocument(sellerId: string, dto: SellerDocumentDto) {
    return this.prisma.sellerDocument.create({ data: { ...dto, sellerId } });
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
      }),
    ]);
    return { total, users: users.map((u) => this.sanitize(u)) };
  }

  async adminVerify(userId: string, isVerified: boolean) {
    const user = await this.prisma.user.update({ where: { id: userId }, data: { isVerified } });
    return this.sanitize(user);
  }

  async adminBan(userId: string, isBanned: boolean) {
    const target = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!target) throw new NotFoundException('User not found');
    if (target.role === UserRole.ADMIN) throw new ForbiddenException('Cannot ban an admin');
    const user = await this.prisma.user.update({ where: { id: userId }, data: { isBanned } });
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
