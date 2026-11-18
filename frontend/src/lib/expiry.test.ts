import { describe, expect, it } from 'vitest';
import { expiryInfo } from './expiry';

const now = Date.parse('2026-11-18T12:00:00Z');
const DAY = 86_400_000;

describe('expiryInfo', () => {
  it('без даты или с мусором — нет подписи', () => {
    expect(expiryInfo(null, { now })).toBeNull();
    expect(expiryInfo(undefined, { now })).toBeNull();
    expect(expiryInfo('не дата', { now })).toBeNull();
  });

  it('подпись календарной даты не зависит от часового пояса', () => {
    expect(expiryInfo('2027-01-05T00:00:00.000Z', { now })).toMatchObject({ label: '05.01.2027', until: '05.01' });
  });

  it('короткий срок — меньше 90 дней, истёкший коротким не считается', () => {
    expect(expiryInfo(new Date(now + 30 * DAY).toISOString(), { now })).toMatchObject({ short: true, expired: false });
    expect(expiryInfo(new Date(now + 200 * DAY).toISOString(), { now })).toMatchObject({ short: false, expired: false });
    expect(expiryInfo(new Date(now - DAY).toISOString(), { now })).toMatchObject({ short: false, expired: true });
  });

  it('флаг бэкенда главнее расчёта по дате', () => {
    const in30 = new Date(now + 30 * DAY).toISOString();
    expect(expiryInfo(in30, { now, shortDated: false })!.short).toBe(false);
    const in200 = new Date(now + 200 * DAY).toISOString();
    expect(expiryInfo(in200, { now, shortDated: true })!.short).toBe(true);
  });
});
