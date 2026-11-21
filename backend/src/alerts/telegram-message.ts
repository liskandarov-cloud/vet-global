import { Alert, Lang, textIn } from './text';

// Сообщение в Telegram: заголовок жирным, текст, кнопка на страницу.
// Кнопка — только на публичный https-адрес: localhost Telegram отклоняет
// вместе со всем сообщением.
export function telegramMessage(alert: Alert, lang: Lang, siteUrl: string) {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const url = alert.url ? `${siteUrl}${alert.url}` : null;
  return {
    text: `<b>${esc(textIn(alert.title, lang))}</b>\n${esc(textIn(alert.body, lang))}`,
    parse_mode: 'HTML' as const,
    disable_web_page_preview: true,
    ...(url?.startsWith('https://')
      ? { reply_markup: { inline_keyboard: [[{ text: lang === 'uz' ? 'Ochish' : 'Открыть', url }]] } }
      : {}),
  };
}
