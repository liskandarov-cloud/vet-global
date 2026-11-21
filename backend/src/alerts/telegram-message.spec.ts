import { telegramMessage } from './telegram-message';
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
