// Выписка по транзакциям Payme за период.
//
// Payme периодически запрашивает у продавца список своих транзакций и сверяет
// его со своим. Метод отвечал пустым списком: с точки зрения провайдера у нас
// не было ни одной транзакции, а значит любое расхождение — потерянный платёж,
// двойное списание, «зависшая» транзакция — оставалось невидимым с обеих
// сторон, пока его не заметит покупатель.
//
// Формат ответа задан протоколом Payme, а не нами: суммы в тийинах, времена в
// миллисекундах, состояние числом. Поэтому преобразование вынесено сюда и
// покрыто тестами — ошибка здесь означает расхождение в сверке, то есть спор о
// деньгах, разбираемый вручную.

export interface StatementPayment {
  id: string;
  orderId: string;
  amount: number;
  providerTransId: string | null;
  createdAt: Date;
  meta?: unknown;
}

export interface PaymeTransaction {
  id: string;
  time: number;
  amount: number;
  account: { order_id: string };
  create_time: number;
  perform_time: number;
  cancel_time: number;
  transaction: string;
  state: number;
  reason: number | null;
}

// Время создания транзакции: Payme присылает его при CreateTransaction, и в
// выписке ожидает то же значение. Если его почему-то нет — берём момент
// создания записи: расхождение в секунды лучше, чем пропуск транзакции.
function createTime(p: StatementPayment): number {
  const meta = (p.meta ?? {}) as Record<string, unknown>;
  const t = Number(meta.create_time);
  return Number.isFinite(t) && t > 0 ? t : p.createdAt.getTime();
}

export function statementFor(
  payments: StatementPayment[],
  from: number,
  to: number,
): PaymeTransaction[] {
  const start = Number(from) || 0;
  const end = Number(to) || Date.now();

  return payments
    // Транзакции без идентификатора Payme в выписку не попадают: их у
    // провайдера нет — это наши внутренние платежи, созданные кнопкой.
    .filter((p) => !!p.providerTransId)
    .filter((p) => {
      const t = createTime(p);
      return t >= start && t <= end;
    })
    .sort((a, b) => createTime(a) - createTime(b))
    .map((p) => {
      const meta = (p.meta ?? {}) as Record<string, unknown>;
      const created = createTime(p);
      return {
        id: p.providerTransId as string,
        time: created,
        // Тийины: протокол Payme считает деньги в сотых долях сума, как и
        // проверка суммы при создании транзакции.
        amount: Math.round(Number(p.amount) * 100),
        account: { order_id: p.orderId },
        create_time: created,
        // Ноль означает «не происходило» — так это читает Payme.
        perform_time: num(meta.perform_time),
        cancel_time: num(meta.cancel_time),
        transaction: p.id,
        // 1 создана, 2 проведена, −1 отменена до проведения, −2 после.
        state: Number.isFinite(Number(meta.paymeState)) ? Number(meta.paymeState) : 1,
        reason: meta.reason == null ? null : Number(meta.reason),
      };
    });
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}
