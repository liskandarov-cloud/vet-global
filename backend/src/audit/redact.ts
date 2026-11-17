// В журнал попадают параметры действия, но не секреты: пароль, назначенный
// через провижининг, иначе лежал бы в базе открытым текстом.
const SECRET_KEY = /pass|secret|token|apikey|api_key|key$/i;

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 4 || value == null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => redact(v, depth + 1));
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([k, v]) => [
      k,
      SECRET_KEY.test(k) ? '[скрыто]' : redact(v, depth + 1),
    ]),
  );
}
