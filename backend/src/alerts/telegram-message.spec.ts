import { channelPost, telegramMessage } from './telegram-message';
import { tt } from './text';

describe('сообщение в Telegram', () => {
  const alert = { title: tt('Заказ #ab12', 'Buyurtma #ab12'), body: tt('Сумма < 5 & >', 'Summa'), url: '/orders/1' };

  it('на языке получателя, с кнопкой на страницу', () => {
    expect(telegramMessage(alert, 'uz', 'https://vethub.uz')).toEqual({
      text: '<b>Buyurtma #ab12</b>\nSumma',
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup: { inline_keyboard: [[{ text: 'Ochish', url: 'https://vethub.uz/orders/1' }]] },
    });
  });

  it('разметка в тексте экранируется, без https кнопки нет', () => {
    const m = telegramMessage(alert, 'ru', 'http://localhost:3000');
    expect(m.text).toBe('<b>Заказ #ab12</b>\nСумма &lt; 5 &amp; &gt;');
    expect(m).not.toHaveProperty('reply_markup');
  });
});

describe('пост в канал', () => {
  it('узбекский, затем русский, кнопка на страницу', () => {
    const p = channelPost({ title: tt('Акция', 'Aksiya'), body: tt('Скидка 10%', '10% chegirma'), url: '/promotions' }, 'https://vethub.uz');
    expect(p.text).toBe('<b>Aksiya</b>\n10% chegirma\n\n<b>Акция</b>\nСкидка 10%');
    expect(p.reply_markup).toEqual({ inline_keyboard: [[{ text: 'Ochish · Открыть', url: 'https://vethub.uz/promotions' }]] });
  });
});

describe('кнопки действий', () => {
  it('отдельным рядом под кнопкой «Открыть»', () => {
    const m = telegramMessage(
      { title: 'Новый продавец', body: 'ООО Тест', url: '/admin', actions: [{ text: '✅ Подтвердить', data: 'verify:1' }] },
      'ru',
      'https://vethub.uz',
    );
    expect(m.reply_markup).toEqual({
      inline_keyboard: [[{ text: 'Открыть', url: 'https://vethub.uz/admin' }], [{ text: '✅ Подтвердить', callback_data: 'verify:1' }]],
    });
  });
});
