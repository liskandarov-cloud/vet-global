import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApprovalStatus, OrderStatus, OrgRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrgDto, InviteMemberDto, UpdateMemberDto } from './dto/organization.dto';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { PushService } from '../push/push.service';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
  ) {}

  // Организация текущего пользователя (первое членство) + участники.
  async myOrg(user: AuthUser) {
    const membership = await this.prisma.orgMembership.findFirst({
      where: { userId: user.id },
      include: {
        org: {
          include: {
            members: {
              orderBy: { createdAt: 'asc' },
              include: { user: { select: { id: true, fullName: true, email: true, phone: true } } },
            },
          },
        },
      },
    });
    if (!membership) return { org: null };
    return {
      org: { id: membership.org.id, name: membership.org.name, inn: membership.org.inn },
      myRole: membership.role,
      myLimit: Number(membership.spendLimit),
      members: membership.org.members.map((m) => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        spendLimit: Number(m.spendLimit),
        user: m.user,
      })),
    };
  }

  async create(dto: CreateOrgDto, user: AuthUser) {
    const existing = await this.prisma.orgMembership.findFirst({ where: { userId: user.id } });
    if (existing) throw new BadRequestException('Вы уже состоите в организации');
    const org = await this.prisma.organization.create({
      data: {
        name: dto.name,
        inn: dto.inn ?? null,
        members: { create: { userId: user.id, role: OrgRole.OWNER, spendLimit: 0 } },
      },
    });
    return this.myOrg(user);
  }

  private async assertManager(user: AuthUser) {
    const m = await this.prisma.orgMembership.findFirst({ where: { userId: user.id } });
    if (!m) throw new NotFoundException('Вы не состоите в организации');
    if (m.role !== OrgRole.OWNER && m.role !== OrgRole.MANAGER)
      throw new ForbiddenException('Недостаточно прав');
    return m;
  }

  async invite(dto: InviteMemberDto, user: AuthUser) {
    const me = await this.assertManager(user);
    const target = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!target) throw new NotFoundException('Пользователь с таким email не зарегистрирован');
    const dup = await this.prisma.orgMembership.findFirst({ where: { userId: target.id } });
    if (dup) throw new BadRequestException('Пользователь уже состоит в организации');
    await this.prisma.orgMembership.create({
      data: {
        orgId: me.orgId,
        userId: target.id,
        role: dto.role ?? OrgRole.PURCHASER,
        spendLimit: dto.spendLimit ?? 0,
      },
    });
    return this.myOrg(user);
  }

  async updateMember(membershipId: string, dto: UpdateMemberDto, user: AuthUser) {
    const me = await this.assertManager(user);
    const target = await this.prisma.orgMembership.findUnique({ where: { id: membershipId } });
    if (!target || target.orgId !== me.orgId) throw new NotFoundException('Участник не найден');
    await this.prisma.orgMembership.update({
      where: { id: membershipId },
      data: {
        role: dto.role ?? target.role,
        spendLimit: dto.spendLimit ?? target.spendLimit,
      },
    });
    return this.myOrg(user);
  }

  async removeMember(membershipId: string, user: AuthUser) {
    const me = await this.assertManager(user);
    const target = await this.prisma.orgMembership.findUnique({ where: { id: membershipId } });
    if (!target || target.orgId !== me.orgId) throw new NotFoundException('Участник не найден');
    if (target.role === OrgRole.OWNER) {
      const owners = await this.prisma.orgMembership.count({
        where: { orgId: me.orgId, role: OrgRole.OWNER },
      });
      if (owners <= 1) throw new BadRequestException('Нельзя удалить единственного владельца');
    }
    await this.prisma.orgMembership.delete({ where: { id: membershipId } });
    return this.myOrg(user);
  }

  // Заказы организации, ожидающие согласования (для OWNER/MANAGER).
  async pendingApprovals(user: AuthUser) {
    const me = await this.prisma.orgMembership.findFirst({ where: { userId: user.id } });
    if (!me || (me.role !== OrgRole.OWNER && me.role !== OrgRole.MANAGER)) return [];
    const orders = await this.prisma.order.findMany({
      where: { orgId: me.orgId, approvalStatus: ApprovalStatus.PENDING },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });
    return orders.map((o) => ({
      id: o.id,
      buyerName: o.buyerName,
      total: Number(o.total),
      createdAt: o.createdAt,
      itemsCount: o.items.length,
    }));
  }

  async decideApproval(orderId: string, approve: boolean, user: AuthUser) {
    const me = await this.assertManager(user);
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.orgId !== me.orgId) throw new NotFoundException('Заказ не найден');
    if (order.approvalStatus !== ApprovalStatus.PENDING)
      throw new BadRequestException('Заказ уже обработан');

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: approve
          ? { approvalStatus: ApprovalStatus.APPROVED, approvedById: user.id }
          : { approvalStatus: ApprovalStatus.REJECTED, approvedById: user.id, status: OrderStatus.CANCELLED },
      });
      // При отклонении освобождаем зарезервированный кредитный лимит.
      if (!approve && order.buyerId && order.paymentTerm !== 'PREPAY') {
        await tx.user.update({
          where: { id: order.buyerId },
          data: { creditUsed: { decrement: Number(order.total) } },
        });
      }
    });
    if (order.buyerId) {
      void this.push.sendToUser(order.buyerId, {
        title: approve ? 'Заказ согласован' : 'Заказ отклонён',
        body: approve ? 'Ваш заказ одобрен — можно оплачивать.' : 'Заказ отклонён согласующим.',
        url: `/orders/${order.id}`,
      });
    }
    return { ok: true };
  }
}
