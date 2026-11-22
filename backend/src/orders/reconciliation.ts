// Акт сверки взаимных расчётов покупателя и продавца за период.
//
// Дебет — то, что покупатель должен (заказ на сумму счёта продавца), кредит —
// оплаты (онлайн и перечислением). Всё, что раньше начала периода, сходится в
// сальдо на начало. Положительное сальдо — долг покупателя продавцу.
export interface ReconEntry {
  date: Date;
  doc: string;
  debit?: number;
  credit?: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function reconcile(entries: ReconEntry[], from: Date, to: Date) {
  let opening = 0;
  const rows: ReconEntry[] = [];
  for (const e of [...entries].sort((a, b) => a.date.getTime() - b.date.getTime())) {
    if (e.date < from) opening += (e.debit ?? 0) - (e.credit ?? 0);
    else if (e.date <= to) rows.push(e);
  }
  const debit = r2(rows.reduce((s, e) => s + (e.debit ?? 0), 0));
  const credit = r2(rows.reduce((s, e) => s + (e.credit ?? 0), 0));
  return { opening: r2(opening), rows, debit, credit, closing: r2(opening + debit - credit) };
}
