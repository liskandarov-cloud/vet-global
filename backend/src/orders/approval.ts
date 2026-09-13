// Нужно ли согласование заказа в организации.
//
// Правило одно на все способы заключить сделку: покупка из каталога, подписка,
// выигранный тендер. Копия правила в каждом пути означала бы, что какой-то из
// путей обходит лимит закупщика — так и было с тендером: закупщик с лимитом
// 0 мог выбрать победителя на любую сумму, и заказ создавался согласованным.

import { ApprovalStatus, OrgRole } from '@prisma/client';

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
