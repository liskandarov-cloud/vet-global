import { Alert, Lang, textIn } from './text';

// Сообщение в Telegram: заголовок жирным, текст, кнопка на страницу.
// Кнопка — только на публичный https-адрес: localhost Telegram отклоняет
// вместе со всем сообщением.
export function telegramMessage(alert: Alert, lang: Lang, siteUrl: string) {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const url = alert.url ? `${siteUrl}${alert.url}` : null;
  const rows: object[][] = [];
  if (url?.startsWith('https://')) rows.push([{ text: lang === 'uz' ? 'Ochish' : 'Открыть', url }]);
  if (alert.actions?.length) rows.push(alert.actions.map((a) => ({ text: textIn(a.text, lang), callback_data: a.data })));
  return {
    text: `<b>${esc(textIn(alert.title, lang))}</b>\n${esc(textIn(alert.body, lang))}`,
    parse_mode: 'HTML' as const,
    disable_web_page_preview: true,
    ...(rows.length ? { reply_markup: { inline_keyboard: rows } } : {}),
  };
}

// Пост в публичный канал площадки: сначала по-узбекски, затем по-русски —
// аудитория смешанная, а пост один.
export function channelPost(alert: Alert, siteUrl: string) {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const part = (lang: Lang) => `<b>${esc(textIn(alert.title, lang))}</b>\n${esc(textIn(alert.body, lang))}`;
  const url = alert.url ? `${siteUrl}${alert.url}` : null;
  return {
    text: `${part('uz')}\n\n${part('ru')}`,
    parse_mode: 'HTML' as const,
    ...(url?.startsWith('https://') ? { reply_markup: { inline_keyboard: [[{ text: 'Ochish · Открыть', url }]] } } : {}),
  };
}
