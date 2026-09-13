import { invoiceNumberFor } from './invoice-number';

describe('invoiceNumberFor — номер счёта', () => {
  const order = (id: string, iso: string) => ({ id, createdAt: new Date(iso) });

  it('собирает номер из года заказа и начала идентификатора', () => {
    expect(invoiceNumberFor(order('4474d0cc-5fe3-496e-9d97-1ed54d226187', '2026-09-12T08:00:00Z')))
      .toBe('VG-2026-4474D0CC');
  });

  it('шестнадцатеричная часть приводится к верхнему регистру', () => {
    expect(invoiceNumberFor(order('abcdef12-0000-0000-0000-000000000000', '2026-01-01T00:00:00Z')))
      .toBe('VG-2026-ABCDEF12');
  });

  it('год берётся из даты заказа, а не из текущей', () => {
    // Счёт по прошлогоднему заказу должен сохранять прошлогодний номер,
    // иначе при повторной выдаче PDF номер изменился бы.
    expect(invoiceNumberFor(order('11111111-2222-3333-4444-555555555555', '2025-12-31T12:00:00Z')))
      .toBe('VG-2025-11111111');
  });

  it('номер одного и того же заказа не меняется между вызовами', () => {
    // На этом держится совпадение номера в PDF и в документе ЭДО: обе системы
    // вызывают одну функцию и должны получать одно значение.
    const o = order('deadbeef-1111-2222-3333-444444444444', '2026-05-05T05:05:05Z');
    expect(invoiceNumberFor(o)).toBe(invoiceNumberFor(o));
  });

  it('разные заказы одного года различаются', () => {
    const a = invoiceNumberFor(order('aaaaaaaa-1111-1111-1111-111111111111', '2026-03-03T00:00:00Z'));
    const b = invoiceNumberFor(order('bbbbbbbb-1111-1111-1111-111111111111', '2026-03-03T00:00:00Z'));
    expect(a).not.toBe(b);
  });

  it('заказы, совпадающие после восьмого знака, дают один номер', () => {
    // Документирует границу формулы: различимость опирается на первые восемь
    // знаков идентификатора. Столкновение маловероятно, но возможно, и если
    // однажды понадобится строгая уникальность — брать её надо из базы, где у
    // Invoice.number стоит unique, а не из этой формулы.
    const a = invoiceNumberFor(order('12345678-aaaa-0000-0000-000000000000', '2026-01-01T00:00:00Z'));
    const b = invoiceNumberFor(order('12345678-bbbb-0000-0000-000000000000', '2026-01-01T00:00:00Z'));
    expect(a).toBe(b);
  });
});

describe('номер счёта по продавцам', () => {
  const order = { id: '9fdbc996-1111-2222-3333-444444444444', createdAt: new Date('2026-09-13T10:00:00Z') };

  it('без продавца формат остаётся прежним', () => {
    expect(invoiceNumberFor(order)).toBe('VG-2026-9FDBC996');
    expect(invoiceNumberFor(order, null)).toBe('VG-2026-9FDBC996');
    expect(invoiceNumberFor(order, '')).toBe('VG-2026-9FDBC996');
  });

  it('с продавцом номер получает его метку', () => {
    expect(invoiceNumberFor(order, '0cbccf65-a81e-4164-a505-0ec4305412c8')).toBe('VG-2026-9FDBC996-0CBC');
  });

  // Номер счёта уникален в базе: одинаковые номера у двух продавцов одного
  // заказа означали бы, что второй документ не сохранится вовсе.
  it('у разных продавцов одного заказа номера разные', () => {
    const a = invoiceNumberFor(order, '0cbccf65-a81e-4164-a505-0ec4305412c8');
    const b = invoiceNumberFor(order, 'd0068dd4-c4d1-4038-8054-e412be2cec79');
    expect(a).not.toBe(b);
  });

  it('номер одного и того же продавца стабилен', () => {
    const seller = '0cbccf65-a81e-4164-a505-0ec4305412c8';
    expect(invoiceNumberFor(order, seller)).toBe(invoiceNumberFor(order, seller));
  });
});
