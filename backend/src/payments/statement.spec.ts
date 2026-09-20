import { statementFor, type StatementPayment } from './statement';

const T0 = new Date('2026-09-20T10:00:00Z').getTime();

const payment = (over: Partial<StatementPayment> = {}): StatementPayment => ({
  id: 'pay-1',
  orderId: 'order-1',
  amount: 145000,
  providerTransId: 'pm-1',
  createdAt: new Date(T0),
  meta: { paymeState: 2, create_time: T0, perform_time: T0 + 60000 },
  ...over,
});

describe('выписка по транзакциям Payme', () => {
  it('отдаёт транзакцию в формате протокола', () => {
    const [tx] = statementFor([payment()], T0 - 1000, T0 + 1000);
    expect(tx).toEqual({
      id: 'pm-1',
      time: T0,
      // Тийины: 145 000 сум это 14 500 000 тийинов.
      amount: 14500000,
      account: { order_id: 'order-1' },
      create_time: T0,
      perform_time: T0 + 60000,
      cancel_time: 0,
      transaction: 'pay-1',
      state: 2,
      reason: null,
    });
  });

  it('в период попадают только транзакции этого периода', () => {
    const inside = payment({ id: 'in', providerTransId: 'pm-in', meta: { create_time: T0 } });
    const before = payment({ id: 'old', providerTransId: 'pm-old', meta: { create_time: T0 - 86400000 } });
    const after = payment({ id: 'new', providerTransId: 'pm-new', meta: { create_time: T0 + 86400000 } });

    const ids = statementFor([before, inside, after], T0 - 1000, T0 + 1000).map((t) => t.transaction);
    expect(ids).toEqual(['in']);
  });

  it('границы периода включаются: сверка идёт встык, и час на стыке суток терять нельзя', () => {
    const edge = payment({ meta: { create_time: T0 } });
    expect(statementFor([edge], T0, T0 + 1)).toHaveLength(1);
    expect(statementFor([edge], T0 - 1, T0)).toHaveLength(1);
  });

  it('платежи без транзакции Payme в выписку не идут', () => {
    // Такой платёж создан кнопкой в кабинете и до провайдера не дошёл.
    expect(statementFor([payment({ providerTransId: null })], 0, Date.now())).toHaveLength(0);
  });

  it('несостоявшиеся времена отдаются нулями, как ожидает протокол', () => {
    const [tx] = statementFor([payment({ meta: { paymeState: 1, create_time: T0 } })], 0, Date.now());
    expect(tx.perform_time).toBe(0);
    expect(tx.cancel_time).toBe(0);
    expect(tx.state).toBe(1);
  });

  it('отменённая транзакция отдаёт причину и время отмены', () => {
    const [tx] = statementFor(
      [payment({ meta: { paymeState: -2, create_time: T0, perform_time: T0 + 1, cancel_time: T0 + 2, reason: 5 } })],
      0,
      Date.now(),
    );
    expect(tx.state).toBe(-2);
    expect(tx.cancel_time).toBe(T0 + 2);
    expect(tx.reason).toBe(5);
  });

  it('без времени создания берётся момент записи, а не пропуск транзакции', () => {
    const [tx] = statementFor([payment({ meta: { paymeState: 1 }, createdAt: new Date(T0) })], 0, Date.now());
    expect(tx.create_time).toBe(T0);
  });

  it('транзакции идут по возрастанию времени', () => {
    const a = payment({ id: 'a', providerTransId: 'pm-a', meta: { create_time: T0 + 2000 } });
    const b = payment({ id: 'b', providerTransId: 'pm-b', meta: { create_time: T0 } });
    expect(statementFor([a, b], 0, Date.now()).map((t) => t.transaction)).toEqual(['b', 'a']);
  });
});
