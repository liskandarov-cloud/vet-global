import { subscriptionFailureNotice } from './failure-notice';

describe('уведомление о несостоявшемся регулярном заказе', () => {
  it('причина — текст ошибки заказа, ссылка — на подписки', () => {
    const n = subscriptionFailureNotice('Вироцид', new Error('Минимальный заказ для «Вироцид» — 5 шт.'));
    expect(n.title).toEqual({ ru: 'Регулярный заказ не оформлен', uz: 'Muntazam buyurtma rasmiylashtirilmadi' });
    expect(n.body).toEqual({
      ru: '«Вироцид»: Минимальный заказ для «Вироцид» — 5 шт. Мы повторим попытку завтра — проверьте подписку.',
      uz: '«Вироцид»: «Вироцид» uchun minimal buyurtma — 5 dona. Ertaga yana urinib koʻramiz — obunani tekshiring.',
    });
    expect(n.url).toBe('/subscriptions');
  });

  it('без названия и без текста ошибки — всё равно понятно', () => {
    expect(subscriptionFailureNotice(null, {}).body).toEqual({
      ru: '«Товар»: неизвестная ошибка. Мы повторим попытку завтра — проверьте подписку.',
      uz: '«Tovar»: nomaʼlum xato. Ertaga yana urinib koʻramiz — obunani tekshiring.',
    });
  });
});
