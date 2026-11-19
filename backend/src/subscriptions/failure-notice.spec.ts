import { subscriptionFailureNotice } from './failure-notice';

describe('уведомление о несостоявшемся регулярном заказе', () => {
  it('причина — текст ошибки заказа, ссылка — на подписки', () => {
    const n = subscriptionFailureNotice('Вироцид', new Error('Минимальный заказ для «Вироцид» — 5 шт.'));
    expect(n.title).toBe('Регулярный заказ не оформлен');
    expect(n.body).toBe('«Вироцид»: Минимальный заказ для «Вироцид» — 5 шт. Мы повторим попытку завтра — проверьте подписку.');
    expect(n.url).toBe('/subscriptions');
  });

  it('без названия и без текста ошибки — всё равно понятно', () => {
    expect(subscriptionFailureNotice(null, {}).body).toBe('«Товар»: неизвестная ошибка. Мы повторим попытку завтра — проверьте подписку.');
  });
});
