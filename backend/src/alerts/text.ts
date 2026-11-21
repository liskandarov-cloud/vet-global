// Текст уведомления на двух языках интерфейса.
//
// Уведомления писались только по-русски, и в узбекском интерфейсе покупатель
// получал заказ, оплату и отмену на чужом языке. Текст задаётся парой прямо в
// месте события — как tt('…', '…') на сайте.
export type Lang = 'ru' | 'uz';
export type Text = string | { ru: string; uz: string };

export interface Alert {
  title: Text;
  body: Text;
  url?: string;
}

export const tt = (ru: string, uz: string): Text => ({ ru, uz });

export const textIn = (t: Text, lang: Lang): string => (typeof t === 'string' ? t : t[lang]);

export const fmt = (n: number) => Math.round(n).toLocaleString('ru-RU');

export const shortId = (id: string) => id.slice(0, 8);

const STATUS: Record<string, { ru: string; uz: string }> = {
  PENDING: { ru: 'Новый', uz: 'Yangi' },
  CONFIRMED: { ru: 'Подтверждён', uz: 'Tasdiqlangan' },
  PROCESSING: { ru: 'В обработке', uz: 'Qayta ishlanmoqda' },
  SHIPPED: { ru: 'Отгружен', uz: 'Joʻnatilgan' },
  DELIVERED: { ru: 'Доставлен', uz: 'Yetkazilgan' },
  CANCELLED: { ru: 'Отменён', uz: 'Bekor qilingan' },
};

export const statusText = (s: string): { ru: string; uz: string } => STATUS[s] ?? { ru: s, uz: s };

// Продавцу: заказ отменён (администратором, согласующим или возвратом оплаты).
export const orderCancelledAlert = (orderId: string): Alert => ({
  title: tt(`Заказ #${shortId(orderId)} отменён`, `Buyurtma #${shortId(orderId)} bekor qilindi`),
  body: tt('Отгружать заказ не нужно — товар вернулся в остаток.', 'Buyurtmani joʻnatish shart emas — tovar qoldiqqa qaytdi.'),
  url: '/seller',
});
