import { ApprovalStatus, OrderStatus, OrgRole } from '@prisma/client';
import { approvalFor, awaitingApprovalError, type Membership } from './approval';

const member = (role: OrgRole, spendLimit: number): Membership => ({ orgId: 'org-1', role, spendLimit });

describe('согласование заказа в организации', () => {
  it('вне организации согласование не требуется', () => {
    expect(approvalFor(null, 1_000_000)).toEqual({ orgId: null, approvalStatus: ApprovalStatus.NONE });
  });

  it('закупщик сверх лимита уходит на согласование, а заказ принадлежит организации', () => {
    expect(approvalFor(member(OrgRole.PURCHASER, 500_000), 500_001)).toEqual({
      orgId: 'org-1',
      approvalStatus: ApprovalStatus.PENDING,
    });
  });

  it('ровно по лимиту согласования не требует', () => {
    expect(approvalFor(member(OrgRole.PURCHASER, 500_000), 500_000).approvalStatus).toBe(ApprovalStatus.NONE);
  });

  it('лимит 0 означает согласование любой покупки', () => {
    expect(approvalFor(member(OrgRole.PURCHASER, 0), 1).approvalStatus).toBe(ApprovalStatus.PENDING);
    // Нулевая сумма лимит не превышает: согласовывать нечего.
    expect(approvalFor(member(OrgRole.PURCHASER, 0), 0).approvalStatus).toBe(ApprovalStatus.NONE);
  });

  it('владелец и управляющий согласования не требуют — они его выдают', () => {
    expect(approvalFor(member(OrgRole.OWNER, 0), 9_000_000).approvalStatus).toBe(ApprovalStatus.NONE);
    expect(approvalFor(member(OrgRole.MANAGER, 0), 9_000_000).approvalStatus).toBe(ApprovalStatus.NONE);
    // Но заказ всё равно принадлежит организации — иначе он выпадет из её отчётов.
    expect(approvalFor(member(OrgRole.OWNER, 0), 1).orgId).toBe('org-1');
  });
});

describe('заказ на согласовании не берётся в работу', () => {
  it('пока ждёт согласования — нельзя подтвердить', () => {
    expect(awaitingApprovalError(ApprovalStatus.PENDING, OrderStatus.CONFIRMED)).toMatch(/согласования/);
  });

  it('отклонённый — нельзя', () => {
    expect(awaitingApprovalError(ApprovalStatus.REJECTED, OrderStatus.CONFIRMED)).toMatch(/отклонён/);
  });

  it('отменить можно', () => {
    expect(awaitingApprovalError(ApprovalStatus.PENDING, OrderStatus.CANCELLED)).toBeNull();
  });

  it('согласованный и не требующий согласования — можно', () => {
    expect(awaitingApprovalError(ApprovalStatus.APPROVED, OrderStatus.CONFIRMED)).toBeNull();
    expect(awaitingApprovalError(ApprovalStatus.NONE, OrderStatus.CONFIRMED)).toBeNull();
  });
});
