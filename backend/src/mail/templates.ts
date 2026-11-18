// HTML писем-уведомлений. Отдельно от сервиса, без Nest и Prisma, чтобы
// шаблоны проверялись юнит-тестами.
//
// Каждая строка от пользователя — имя, телефон, компания, название товара,
// текст заявки — проходит через h(): они приходят с публичных форм и из
// прайсов, и «<a href=…>» в имени иначе стал бы ссылкой в письме от VetHub.
import { EMAIL, PHONE_DISPLAY } from '../common/contacts';
import { escapeHtml as h } from '../common/html';

export const money = (n: number) => `${Math.round(n).toLocaleString('ru-RU')} сум`;

export function layout(title: string, body: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif">
  <div style="max-width:560px;margin:24px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
    <div style="background:linear-gradient(90deg,#0d9488,#10b981);padding:20px 24px;color:#fff">
      <div style="font-size:20px;font-weight:800">VetHub</div>
    </div>
    <div style="padding:24px">
      <h2 style="margin:0 0 12px;color:#0f172a;font-size:18px">${title}</h2>
      ${body}
    </div>
    <div style="padding:16px 24px;border-top:1px solid #f1f5f9;color:#94a3b8;font-size:12px">
      Это автоматическое уведомление платформы VetHub. Вопросы: ${PHONE_DISPLAY}, ${EMAIL}.
    </div>
  </div></body></html>`;
}

export function itemsTable(items: { productName: string; quantity: number; price: number }[]): string {
  const rows = items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0;color:#475569">${h(i.productName)} × ${i.quantity}</td>
         <td style="padding:6px 0;text-align:right;color:#0f172a">${money(i.price * i.quantity)}</td></tr>`,
    )
    .join('');
  return `<table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:14px">${rows}</table>`;
}

export function orderLine(
  shortId: string,
  o: { buyerName: string; buyerPhone: string; buyerCompany: string | null },
): string {
  return `<p style="color:#475569">Заказ <b>#${shortId}</b> от ${h(o.buyerName)} (${h(o.buyerPhone)})${o.buyerCompany ? `, ${h(o.buyerCompany)}` : ''}.</p>`;
}

export function leadBody(lead: {
  source: string;
  fullName: string;
  phone: string;
  productName: string | null;
  quantity: number | null;
  message: string | null;
}): string {
  return `
      <p style="color:#475569">Источник: <b>${h(lead.source)}</b></p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin:12px 0">
        <tr><td style="padding:4px 0;color:#94a3b8">Имя</td><td style="padding:4px 0;color:#0f172a">${h(lead.fullName)}</td></tr>
        <tr><td style="padding:4px 0;color:#94a3b8">Телефон</td><td style="padding:4px 0;color:#0f172a">${h(lead.phone)}</td></tr>
        ${lead.productName ? `<tr><td style="padding:4px 0;color:#94a3b8">Товар</td><td style="padding:4px 0;color:#0f172a">${h(lead.productName)}${lead.quantity ? ` × ${lead.quantity}` : ''}</td></tr>` : ''}
        ${lead.message ? `<tr><td style="padding:4px 0;color:#94a3b8">Сообщение</td><td style="padding:4px 0;color:#0f172a">${h(lead.message)}</td></tr>` : ''}
      </table>`;
}

export function consultBody(c: { fullName: string; phone: string; topic: string; message: string }): string {
  return `<table style="width:100%;border-collapse:collapse;font-size:14px;margin:12px 0">
          <tr><td style="padding:4px 0;color:#94a3b8">Клиент</td><td style="color:#0f172a">${h(c.fullName)} (${h(c.phone)})</td></tr>
          <tr><td style="padding:4px 0;color:#94a3b8">Тема</td><td style="color:#0f172a">${h(c.topic)}</td></tr>
          <tr><td style="padding:4px 0;color:#94a3b8">Вопрос</td><td style="color:#0f172a">${h(c.message)}</td></tr>
        </table>`;
}
