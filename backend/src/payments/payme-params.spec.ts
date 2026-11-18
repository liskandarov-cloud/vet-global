import { parsePaymeParams, paymeAuthValid, paymeMeta } from './payme-params';

describe('параметры Payme', () => {
  it('принимает параметры по спецификации', () => {
    expect(parsePaymeParams({ id: 'tx1', time: 1700000000000, amount: 500000, account: { order_id: 'o-1' } })).toEqual({
      id: 'tx1', time: 1700000000000, amount: 500000, account: { order_id: 'o-1' },
    });
    expect(parsePaymeParams({ from: 1, to: 2 })).toEqual({ from: 1, to: 2 });
    expect(parsePaymeParams(undefined)).toEqual({});
  });

  // Объект в id Prisma прочитала бы как фильтр и нашла бы чужой платёж.
  it('отвергает операторы Prisma и не те типы', () => {
    expect(parsePaymeParams({ id: { not: null } })).toBeNull();
    expect(parsePaymeParams({ id: ['tx1'] })).toBeNull();
    expect(parsePaymeParams({ id: '' })).toBeNull();
    expect(parsePaymeParams({ id: 'tx1', account: { order_id: { contains: '' } } })).toBeNull();
    expect(parsePaymeParams({ amount: '500000' })).toBeNull();
    expect(parsePaymeParams({ time: Number.NaN })).toBeNull();
    expect(parsePaymeParams('tx1')).toBeNull();
    expect(parsePaymeParams([])).toBeNull();
  });

  it('meta: только объект, иначе пустое состояние', () => {
    expect(paymeMeta({ paymeState: 2, perform_time: 5 })).toEqual({ paymeState: 2, perform_time: 5 });
    expect(paymeMeta(null)).toEqual({});
    expect(paymeMeta('x')).toEqual({});
    expect(paymeMeta([1])).toEqual({});
  });
});

describe('ключ Payme', () => {
  const basic = (s: string) => 'Basic ' + Buffer.from(s).toString('base64');

  it('верный логин и ключ', () => {
    expect(paymeAuthValid(basic('Paycom:secret'), 'secret')).toBe(true);
    expect(paymeAuthValid(basic('Paycom:se:cret'), 'se:cret')).toBe(true);
  });

  it('неверный или отсутствующий', () => {
    expect(paymeAuthValid(basic('Paycom:wrong'), 'secret')).toBe(false);
    expect(paymeAuthValid(basic('Paycom:secre'), 'secret')).toBe(false);
    expect(paymeAuthValid(basic('Other:secret'), 'secret')).toBe(false);
    expect(paymeAuthValid(basic('Paycom'), 'secret')).toBe(false);
    expect(paymeAuthValid('Bearer x', 'secret')).toBe(false);
    expect(paymeAuthValid(undefined, 'secret')).toBe(false);
    // Без ключа в окружении доступа нет ни у кого, даже с пустым паролем.
    expect(paymeAuthValid(basic('Paycom:'), undefined)).toBe(false);
    expect(paymeAuthValid(basic('Paycom:'), '')).toBe(false);
  });
});
