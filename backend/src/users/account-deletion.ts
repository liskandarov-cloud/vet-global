// Удаление аккаунта владельцем.
//
// По закону о персональных данных пользователь вправе отозвать согласие, и
// тогда его данные удаляются — кроме тех, что нужно хранить по закону
// (заказы, счета, платежи). Поэтому строка пользователя не удаляется, а
// обезличивается: на неё ссылаются документы сделок.
//
// Удаление откладывается, если оно навредит другим: незавершённые заказы
// (покупатель или продавец ждёт исполнения), долг по кредиту, организация
// с сотрудниками, которая осталась бы без владельца.

export interface DeletionState {
  role: string;
  activeBuyerOrders: number;
  activeSellerOrders: number;
  creditUsed: number;
  ownsOrgWithOthers: boolean;
}

export function deletionBlocker(s: DeletionState): string | null {
  if (s.role === 'ADMIN') return 'Учётную запись администратора удаляет другой администратор';
  if (s.activeBuyerOrders > 0) return 'Есть незавершённые заказы. Дождитесь доставки или отмените их, затем удалите аккаунт';
  if (s.activeSellerOrders > 0) return 'Есть заказы покупателей, которые вы ещё не исполнили. Завершите или отмените их, затем удалите аккаунт';
  if (s.creditUsed > 0) return 'Есть задолженность по отсрочке или рассрочке. Погасите её, затем удалите аккаунт';
  if (s.ownsOrgWithOthers) return 'Вы владелец организации, в которой есть сотрудники. Передайте права владельца, затем удалите аккаунт';
  return null;
}

// Что остаётся вместо персональных данных. Почта уникальна и освобождается,
// чтобы человек мог при желании зарегистрироваться заново.
export function anonymizedProfile(userId: string) {
  return {
    email: `deleted+${userId}@deleted.vethub.uz`,
    fullName: 'Удалённый пользователь',
    phone: '',
    company: null,
    inn: null,
    description: null,
    logoUrl: null,
    bankName: null,
    bankAccount: null,
    bankMfo: null,
    syncApiKey: null,
  };
}
