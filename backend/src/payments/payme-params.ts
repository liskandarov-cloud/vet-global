// Вход Payme Merchant API: разбор параметров, состояние транзакции и ключ.
// Без Nest и Prisma, чтобы проверялось юнит-тестами.
//
// Тело JSON-RPC шло в запросы к базе как есть. Объект вместо строки в
// params.id Prisma читает как фильтр: { "not": null } находил первый же
// платёж, и PerformTransaction провёл бы его как оплаченный. Отсутствующий
// id давал where без условия — тот же результат. От этого закрывал только
// ключ Payme, поэтому проверяем типы на входе, а не полагаемся на него.
import { timingSafeEqual } from 'crypto';

export interface PaymeParams {
  id?: string;
  time?: number;
  amount?: number;
  reason?: number;
  from?: number;
  to?: number;
  account?: { order_id?: string };
}

// Состояние транзакции в Payment.meta. Тип, а не interface: так он
// совместим с JSON-полем Prisma при записи.
export type PaymeMeta = {
  paymeState?: number;
  create_time?: number;
  perform_time?: number;
  cancel_time?: number;
  reason?: number | null;
};

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isId = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 200;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

// null — параметры не по спецификации (ответ −32600).
export function parsePaymeParams(raw: unknown): PaymeParams | null {
  if (raw === undefined || raw === null) return {};
  if (!isObj(raw)) return null;
  const out: PaymeParams = {};
  if (raw.id !== undefined) {
    if (!isId(raw.id)) return null;
    out.id = raw.id;
  }
  for (const k of ['time', 'amount', 'reason', 'from', 'to'] as const) {
    if (raw[k] === undefined) continue;
    if (!isNum(raw[k])) return null;
    out[k] = raw[k];
  }
  if (raw.account !== undefined) {
    if (!isObj(raw.account)) return null;
    const orderId = raw.account.order_id;
    if (orderId !== undefined && !isId(orderId)) return null;
    out.account = orderId === undefined ? {} : { order_id: orderId };
  }
  return out;
}

export function paymeMeta(json: unknown): PaymeMeta {
  return isObj(json) ? (json as PaymeMeta) : {};
}

// Basic base64(Paycom:KEY). Сравнение за постоянное время; ключ может
// содержать «:», поэтому делим только по первому.
export function paymeAuthValid(header: string | undefined, key: string | undefined): boolean {
  if (!key || !header?.startsWith('Basic ')) return false;
  const decoded = Buffer.from(header.slice(6), 'base64').toString();
  const i = decoded.indexOf(':');
  if (i < 0 || decoded.slice(0, i) !== 'Paycom') return false;
  const given = Buffer.from(decoded.slice(i + 1));
  const expected = Buffer.from(key);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
