import { OrgRole } from '@prisma/client';
import { inviteRoleError, memberChangeError, type MemberRef } from './permissions';

const owner: MemberRef = { membershipId: 'm-owner', role: OrgRole.OWNER };
const manager: MemberRef = { membershipId: 'm-manager', role: OrgRole.MANAGER };
const purchaser: MemberRef = { membershipId: 'm-purchaser', role: OrgRole.PURCHASER };

describe('права в организации', () => {
  it('владелец меняет роли', () => {
    expect(memberChangeError(owner, purchaser, { role: OrgRole.MANAGER }, 1)).toBeNull();
  });

  // Это и было дырой: права управляющего и владельца были равны.
  it('управляющий роли не меняет', () => {
    expect(memberChangeError(manager, purchaser, { role: OrgRole.MANAGER }, 1)).toMatch(/только владелец/);
  });

  it('управляющий не повышает себя до владельца', () => {
    expect(memberChangeError(manager, manager, { role: OrgRole.OWNER }, 1)).toMatch(/только владелец/);
  });

  it('управляющий не понижает владельца', () => {
    expect(memberChangeError(manager, owner, { role: OrgRole.PURCHASER }, 1)).toMatch(/только владелец/);
  });

  // Организацию без владельца никто не починит изнутри: некому согласовывать
  // заказы и менять состав.
  it('единственного владельца нельзя понизить даже ему самому', () => {
    expect(memberChangeError(owner, owner, { role: OrgRole.MANAGER }, 1)).toMatch(/без владельца/);
  });

  it('при двух владельцах понижение одного допустимо', () => {
    expect(memberChangeError(owner, owner, { role: OrgRole.MANAGER }, 2)).toBeNull();
  });

  it('управляющий настраивает лимиты закупщиков — это его работа', () => {
    expect(memberChangeError(manager, purchaser, { spendLimit: 3000000 }, 1)).toBeNull();
  });

  // Иначе управляющий выставил бы владельцу нулевой лимит и отправлял бы его
  // заказы на согласование самому себе.
  it('лимит владельца управляющий не трогает', () => {
    expect(memberChangeError(manager, owner, { spendLimit: 0 }, 1)).toMatch(/только владелец/);
  });

  it('роль, совпадающая с нынешней, за смену не считается', () => {
    expect(memberChangeError(manager, purchaser, { role: OrgRole.PURCHASER, spendLimit: 5 }, 1)).toBeNull();
  });
});

describe('кого можно пригласить', () => {
  it('владелец приглашает кого угодно', () => {
    expect(inviteRoleError(OrgRole.OWNER, OrgRole.OWNER)).toBeNull();
    expect(inviteRoleError(OrgRole.OWNER, OrgRole.MANAGER)).toBeNull();
  });

  it('управляющий приглашает только закупщиков', () => {
    expect(inviteRoleError(OrgRole.MANAGER, OrgRole.PURCHASER)).toBeNull();
    expect(inviteRoleError(OrgRole.MANAGER, OrgRole.OWNER)).toMatch(/только владелец/);
    expect(inviteRoleError(OrgRole.MANAGER, OrgRole.MANAGER)).toMatch(/только владелец/);
  });
});
