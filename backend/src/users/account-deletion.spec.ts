import { anonymizedProfile, deletionBlocker } from './account-deletion';

const free = { role: 'BUYER', activeBuyerOrders: 0, activeSellerOrders: 0, creditUsed: 0, ownsOrgWithOthers: false };

describe('удаление аккаунта', () => {
  it('ничего не мешает — удалять можно', () => {
    expect(deletionBlocker(free)).toBeNull();
    expect(deletionBlocker({ ...free, role: 'SELLER' })).toBeNull();
  });

  it('администратор, незавершённые заказы, долг и организация с сотрудниками блокируют', () => {
    expect(deletionBlocker({ ...free, role: 'ADMIN' })).toMatch(/администратор/);
    expect(deletionBlocker({ ...free, activeBuyerOrders: 1 })).toMatch(/незавершённые заказы/);
    expect(deletionBlocker({ ...free, activeSellerOrders: 2 })).toMatch(/не исполнили/);
    expect(deletionBlocker({ ...free, creditUsed: 100 })).toMatch(/задолженность/);
    expect(deletionBlocker({ ...free, ownsOrgWithOthers: true })).toMatch(/владелец организации/);
  });

  it('обезличенный профиль не содержит ничего от прежнего', () => {
    const p = anonymizedProfile('u1');
    expect(p.email).toBe('deleted+u1@deleted.vethub.uz');
    expect(Object.values(p).filter((v) => v !== null && v !== '' && !String(v).includes('u1') && v !== 'Удалённый пользователь')).toEqual([]);
  });
});
