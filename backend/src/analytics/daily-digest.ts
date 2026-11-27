// Утренняя сводка за вчера — в Telegram-чат команды.
//
// Владелец узнавал о жизни площадки, только открыв админку. Сводка в 9:00
// по Ташкенту: заказы и оборот, новые пользователи, заявки, кто ждёт проверки.

export interface DigestNumbers {
  orders: number;
  revenue: number;
  buyers: number;
  sellers: number;
  leads: number;
  consults: number;
  pendingSellers: number;
}

const TZ_OFFSET_MS = 5 * 3_600_000; // Ташкент, UTC+5 без перехода на летнее время

// Границы вчерашнего дня по Ташкенту в UTC.
export function yesterdayWindow(now: Date): { from: Date; to: Date; label: string } {
  const local = new Date(now.getTime() + TZ_OFFSET_MS);
  const to = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - TZ_OFFSET_MS);
  const from = new Date(to.getTime() - 86_400_000);
  const d = new Date(from.getTime() + TZ_OFFSET_MS);
  const label = `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${d.getUTCFullYear()}`;
  return { from, to, label };
}

export function digestText(n: DigestNumbers, label: string, site: string): string {
  const money = Math.round(n.revenue).toLocaleString('ru-RU');
  return [
    `📊 <b>VetHub — сводка за ${label}</b>`,
    `🛒 Заказы: ${n.orders}${n.orders ? ` на ${money} сум` : ''}`,
    `👤 Новые покупатели: ${n.buyers} · продавцы: ${n.sellers}`,
    `📝 Заявки: ${n.leads} · консультации: ${n.consults}`,
    ...(n.pendingSellers ? [`⏳ Ждут проверки продавцов: ${n.pendingSellers}`] : []),
    `${site}/admin`,
  ].join('\n');
}
