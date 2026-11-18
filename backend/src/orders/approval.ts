// Нужно ли согласование заказа в организации.
//
// Правило одно на все способы заключить сделку: покупка из каталога, подписка,
// выигранный тендер. Копия правила в каждом пути означала бы, что какой-то из
// путей обходит лимит закупщика — так и было с тендером: закупщик с лимитом
// 0 мог выбрать победителя на любую сумму, и заказ создавался согласованным.

import { ApprovalStatus, OrderStatus, OrgRole } from '@prisma/client';

export interface Membership {
  orgId: string;
  role: OrgRole;
  spendLimit: number;
}

export interface ApprovalDecision {
  orgId: string | null;
  approvalStatus: ApprovalStatus;
}

// Владелец и управляющий согласования не требуют — они его и выдают. Закупщик
// требует, когда сумма превышает его лимит; лимит 0 означает «всегда».
export function approvalFor(membership: Membership | null | undefined, total: number): ApprovalDecision {
  if (!membership) return { orgId: null, approvalStatus: ApprovalStatus.NONE };
  const needs =
    membership.role === OrgRole.PURCHASER && Number(total) > Number(membership.spendLimit);
  return {
    orgId: membership.orgId,
    approvalStatus: needs ? ApprovalStatus.PENDING : ApprovalStatus.NONE,
  };
}

// Заказ, ждущий согласования в организации, в работу не берётся: продавец
// подтверждал и отгружал его раньше, чем руководитель покупателя соглашался
// на трату. Отменить его можно — это не трата.
export function awaitingApprovalError(approvalStatus: ApprovalStatus, to: OrderStatus): string | null {
  if (to === OrderStatus.CANCELLED) return null;
  if (approvalStatus === ApprovalStatus.PENDING) return 'Заказ ждёт согласования в организации покупателя';
  if (approvalStatus === ApprovalStatus.REJECTED) return 'Заказ отклонён организацией покупателя';
  return null;
}
