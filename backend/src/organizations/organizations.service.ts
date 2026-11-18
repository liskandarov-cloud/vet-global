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
import { AlertsService } from '../alerts/alerts.service';
import { OrderReleaseService } from '../orders/order-release.service';
import { inviteRoleError, memberChangeError, removeMemberError } from './permissions';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alerts: AlertsService,
    private readonly release: OrderReleaseService,
  ) {}

  // Организация текущего пользователя (действующее членство) + участники.
  // Без него — ожидающее приглашение, если есть.
  async myOrg(user: AuthUser) {
    const membership = await this.prisma.orgMembership.findFirst({
      where: { userId: user.id, acceptedAt: { not: null } },
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
    if (!membership) {
      const invite = await this.prisma.orgMembership.findFirst({
        where: { userId: user.id, acceptedAt: null },
        orderBy: { createdAt: 'desc' },
        include: { org: { select: { name: true } } },
      });
      return {
        org: null,
        invitation: invite
          ? { id: invite.id, orgName: invite.org.name, role: invite.role, spendLimit: Number(invite.spendLimit), invitedAt: invite.createdAt }
          : null,
      };
    }
    return {
      org: { id: membership.org.id, name: membership.org.name, inn: membership.org.inn },
      myRole: membership.role,
      myLimit: Number(membership.spendLimit),
      members: membership.org.members.map((m) => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        spendLimit: Number(m.spendLimit),
        // До согласия приглашённого организация видит только его email.
        pending: !m.acceptedAt,
        user: m.acceptedAt ? m.user : { id: m.user.id, email: m.user.email, fullName: m.user.email, phone: '' },
      })),
    };
  }

  async create(dto: CreateOrgDto, user: AuthUser) {
    const existing = await this.prisma.orgMembership.findFirst({ where: { userId: user.id, acceptedAt: { not: null } } });
    if (existing) throw new BadRequestException('Вы уже состоите в организации');
    await this.prisma.organization.create({
      data: {
        name: dto.name,
        inn: dto.inn ?? null,
        members: { create: { userId: user.id, role: OrgRole.OWNER, spendLimit: 0 } },
      },
    });
    return this.myOrg(user);
  }

  private async assertManager(user: AuthUser) {
    const m = await this.prisma.orgMembership.findFirst({ where: { userId: user.id, acceptedAt: { not: null } } });
    if (!m) throw new NotFoundException('Вы не состоите в организации');
    if (m.role !== OrgRole.OWNER && m.role !== OrgRole.MANAGER)
      throw new ForbiddenException('Недостаточно прав');
    return m;
  }

  async invite(dto: InviteMemberDto, user: AuthUser) {
    const me = await this.assertManager(user);
    // Приглашение с ролью владельца или управляющего — дело владельца: иначе
    // управляющий заводит себе второго владельца и меняет состав через него.
    const inviteError = inviteRoleError(me.role, dto.role ?? OrgRole.PURCHASER);
    if (inviteError) throw new ForbiddenException(inviteError);

    const target = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!target) throw new NotFoundException('Пользователь с таким email не зарегистрирован');
    const dup = await this.prisma.orgMembership.findFirst({ where: { userId: target.id, acceptedAt: { not: null } } });
    if (dup) throw new BadRequestException('Пользователь уже состоит в организации');
    const invited = await this.prisma.orgMembership.findUnique({ where: { orgId_userId: { orgId: me.orgId, userId: target.id } } });
    if (invited) throw new BadRequestException('Приглашение этому пользователю уже отправлено');
    // Приглашение действует после согласия приглашённого. Раньше любого можно
    // было добавить без спроса: организация видела его телефон и имя, а его
    // заказы уходили на согласование посторонним.
    await this.prisma.orgMembership.create({
      data: {
        orgId: me.orgId,
        userId: target.id,
        role: dto.role ?? OrgRole.PURCHASER,
        spendLimit: dto.spendLimit ?? 0,
        acceptedAt: null,
      },
    });
    const org = await this.prisma.organization.findUnique({ where: { id: me.orgId }, select: { name: true } });
    void this.alerts.notify(target.id, {
      title: 'Приглашение в организацию',
      body: `${user.fullName} приглашает вас в организацию «${org?.name ?? ''}». Примите или отклоните приглашение на странице «Организация».`,
      url: '/org',
    });
    return this.myOrg(user);
  }

  // Ответ на приглашение. Принять можно, только не состоя в другой организации.
  private async myInvitation(user: AuthUser, membershipId?: string) {
    const invite = await this.prisma.orgMembership.findFirst({
      where: { userId: user.id, acceptedAt: null, ...(membershipId ? { id: membershipId } : {}) },
      orderBy: { createdAt: 'desc' },
    });
    if (!invite) throw new NotFoundException('Приглашение не найдено');
    return invite;
  }

  async acceptInvitation(user: AuthUser, membershipId?: string) {
    const invite = await this.myInvitation(user, membershipId);
    const active = await this.prisma.orgMembership.findFirst({ where: { userId: user.id, acceptedAt: { not: null } } });
    if (active) throw new BadRequestException('Сначала выйдите из текущей организации');
    await this.prisma.orgMembership.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });
    return this.myOrg(user);
  }

  async declineInvitation(user: AuthUser, membershipId?: string) {
    const invite = await this.myInvitation(user, membershipId);
    await this.prisma.orgMembership.delete({ where: { id: invite.id } });
    return this.myOrg(user);
  }

  // Выход из организации по собственной воле. Единственный владелец выйти не
  // может — организация осталась бы без управления (как и при удалении).
  async leave(user: AuthUser) {
    const m = await this.prisma.orgMembership.findFirst({ where: { userId: user.id, acceptedAt: { not: null } } });
    if (!m) throw new NotFoundException('Вы не состоите в организации');
    if (m.role === OrgRole.OWNER) {
      const owners = await this.prisma.orgMembership.count({ where: { orgId: m.orgId, role: OrgRole.OWNER, acceptedAt: { not: null } } });
      const others = await this.prisma.orgMembership.count({ where: { orgId: m.orgId, userId: { not: user.id }, acceptedAt: { not: null } } });
      if (owners <= 1 && others > 0) {
        throw new BadRequestException('Вы единственный владелец: передайте права владельца, затем выйдите');
      }
    }
    await this.prisma.orgMembership.delete({ where: { id: m.id } });
    return { org: null };
  }

  async updateMember(membershipId: string, dto: UpdateMemberDto, user: AuthUser) {
    const me = await this.assertManager(user);
    const target = await this.prisma.orgMembership.findUnique({ where: { id: membershipId } });
    if (!target || target.orgId !== me.orgId) throw new NotFoundException('Участник не найден');

    // Права управляющего и владельца были равны, и управляющий мог понизить
    // владельца, в том числе единственного, оставив организацию без него, —
    // а заодно повысить себя.
    const owners = await this.prisma.orgMembership.count({
      where: { orgId: me.orgId, role: OrgRole.OWNER, acceptedAt: { not: null } },
    });
    const error = memberChangeError(
      { membershipId: me.id, role: me.role },
      { membershipId: target.id, role: target.role },
      { role: dto.role, spendLimit: dto.spendLimit },
      owners,
    );
    if (error) throw new ForbiddenException(error);

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
    const removeError = removeMemberError(
      { membershipId: me.id, role: me.role },
      { membershipId: target.id, role: target.role },
    );
    if (removeError) throw new ForbiddenException(removeError);
    if (target.role === OrgRole.OWNER) {
      const owners = await this.prisma.orgMembership.count({
        where: { orgId: me.orgId, role: OrgRole.OWNER, acceptedAt: { not: null } },
      });
      if (owners <= 1) throw new BadRequestException('Нельзя удалить единственного владельца');
    }
    await this.prisma.orgMembership.delete({ where: { id: membershipId } });
    return this.myOrg(user);
  }

  // Заказы организации, ожидающие согласования (для OWNER/MANAGER).
  async pendingApprovals(user: AuthUser) {
    const me = await this.prisma.orgMembership.findFirst({ where: { userId: user.id, acceptedAt: { not: null } } });
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
      items: o.items.map((it) => ({ productName: it.productName, quantity: it.quantity, price: Number(it.price) })),
    }));
  }

  // Все заказы организации — владельцу и управляющему: раньше они видели
  // только заказы на согласовании, а общей истории закупок не было.
  async orgOrders(user: AuthUser) {
    const me = await this.prisma.orgMembership.findFirst({ where: { userId: user.id, acceptedAt: { not: null } } });
    if (!me || (me.role !== OrgRole.OWNER && me.role !== OrgRole.MANAGER)) return [];
    const orders = await this.prisma.order.findMany({
      where: { orgId: me.orgId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id: true, buyerName: true, total: true, status: true, approvalStatus: true, createdAt: true, _count: { select: { items: true } } },
    });
    return orders.map(({ _count, ...o }) => ({ ...o, total: Number(o.total), itemsCount: _count.items }));
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
    });

    // Отклонение — это отмена заказа, поэтому возвращается всё занятое: лимит,
    // баллы и остаток на складе. Раньше здесь освобождался только лимит, и
    // своей копией расчёта: баллы покупателя сгорали, товар оставался списанным.
    if (!approve) {
      await this.release.onCancelled(orderId);
    }
    if (order.buyerId) {
      void this.alerts.notify(order.buyerId, {
        title: approve ? 'Заказ согласован' : 'Заказ отклонён',
        body: approve ? 'Ваш заказ одобрен — можно оплачивать.' : 'Заказ отклонён согласующим.',
        url: `/orders/${order.id}`,
      });
    }
    return { ok: true };
  }
}
