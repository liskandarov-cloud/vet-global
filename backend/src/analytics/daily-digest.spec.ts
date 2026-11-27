import { digestText, yesterdayWindow } from './daily-digest';

describe('утренняя сводка', () => {
  it('вчерашний день — по Ташкенту', () => {
    // 27.11 03:30 UTC = 27.11 08:30 в Ташкенте → вчера 26.11 с 00:00 до 24:00 по Ташкенту.
    const w = yesterdayWindow(new Date('2026-11-27T03:30:00Z'));
    expect(w.from.toISOString()).toBe('2026-11-25T19:00:00.000Z');
    expect(w.to.toISOString()).toBe('2026-11-26T19:00:00.000Z');
    expect(w.label).toBe('26.11.2026');
  });

  it('текст: оборот только при заказах, проверка — только если ждут', () => {
    const t = digestText({ orders: 3, revenue: 1250000, buyers: 5, sellers: 1, leads: 2, consults: 0, pendingSellers: 1 }, '26.11.2026', 'https://vethub.uz');
    expect(t).toContain('Заказы: 3 на 1');
    expect(t).toContain('Ждут проверки продавцов: 1');
    const quiet = digestText({ orders: 0, revenue: 0, buyers: 0, sellers: 0, leads: 0, consults: 0, pendingSellers: 0 }, '26.11.2026', 'https://vethub.uz');
    expect(quiet).toContain('Заказы: 0\n');
    expect(quiet).not.toContain('Ждут проверки');
  });
});
