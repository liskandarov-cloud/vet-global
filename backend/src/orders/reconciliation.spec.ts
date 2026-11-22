import { reconcile } from './reconciliation';

describe('акт сверки', () => {
  const d = (s: string) => new Date(s);
  const entries = [
    { date: d('2026-10-05'), doc: 'Заказ №1', debit: 1000 },
    { date: d('2026-10-20'), doc: 'Оплата №1', credit: 400 },
    { date: d('2026-11-03'), doc: 'Заказ №2', debit: 500.555 },
    { date: d('2026-11-10'), doc: 'Оплата №1', credit: 600 },
    { date: d('2026-12-01'), doc: 'Заказ №3', debit: 999 },
  ];

  it('до периода — в сальдо на начало, после — не попадает', () => {
    const r = reconcile(entries, d('2026-11-01'), d('2026-11-30T23:59:59.999Z'));
    expect(r.opening).toBe(600);
    expect(r.rows.map((e) => e.doc)).toEqual(['Заказ №2', 'Оплата №1']);
    expect([r.debit, r.credit, r.closing]).toEqual([500.56, 600, 500.56]);
  });

  it('переплата — отрицательное сальдо', () => {
    const r = reconcile([{ date: d('2026-11-02'), doc: 'Оплата', credit: 300 }], d('2026-11-01'), d('2026-11-30'));
    expect(r.closing).toBe(-300);
  });
});
