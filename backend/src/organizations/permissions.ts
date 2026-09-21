// Кто и что может менять в составе организации.
//
// Права управляющего и владельца были равны: обе роли проходили одну и ту же
// проверку. Из этого следовало то, чего никто не имел в виду — управляющий мог
// понизить владельца (в том числе единственного, оставив организацию без него),
// повысить себя до владельца и пригласить нового владельца. Организация
// распоряжается деньгами: у её участников лимиты закупок и согласование
// заказов, поэтому захват прав здесь — это доступ к чужим закупкам.
//
// Правило простое: состав и роли — дело владельца. Управляющий занимается
// закупщиками: приглашает их и настраивает лимиты.

import { OrgRole } from '@prisma/client';

export interface MemberRef {
  membershipId: string;
  role: OrgRole;
}

export interface MemberChange {
  role?: OrgRole;
  spendLimit?: number;
}

// null — менять можно.
export function memberChangeError(
  actor: MemberRef,
  target: MemberRef,
  change: MemberChange,
  ownersCount: number,
): string | null {
  const changesRole = change.role != null && change.role !== target.role;

  if (changesRole) {
    if (actor.role !== OrgRole.OWNER) {
      return 'Менять роли участников может только владелец организации';
    }
    // Организация без владельца никем не управляется: некому согласовывать
    // заказы и менять состав, а починить это изнутри уже нельзя.
    if (target.role === OrgRole.OWNER && ownersCount <= 1) {
      return 'Нельзя оставить организацию без владельца';
    }
  }

  // Лимит владельца — тоже его дело: иначе управляющий выставил бы владельцу
  // нулевой лимит и отправлял бы его заказы на согласование самому себе.
  if (change.spendLimit != null && target.role === OrgRole.OWNER && actor.role !== OrgRole.OWNER) {
    return 'Лимит владельца меняет только владелец';
  }

  return null;
}

// Кого можно пригласить. Управляющий приглашает только закупщиков: приглашение
// с ролью владельца — тот же захват прав, только с другой стороны.
export function inviteRoleError(actorRole: OrgRole, invitedRole: OrgRole): string | null {
  if (actorRole === OrgRole.OWNER) return null;
  if (invitedRole !== OrgRole.PURCHASER) {
    return 'Приглашать владельцев и управляющих может только владелец организации';
  }
  return null;
}
