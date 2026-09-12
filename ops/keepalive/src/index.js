// Пинг прод-бэкенда VetGlobal по расписанию.
//
// Закрывает две особенности бесплатных тарифов, из-за которых прод уже падал:
//
//   Supabase снимает проект с обслуживания после 7 суток без обращений к базе.
//   В этом же аккаунте так уже уснули betterfuture-dashboard и fincor.
//   Поэтому пинг идёт не в /api/health (он отдаёт статический объект и базу не
//   трогает), а в /api/categories — этот эндпоинт действительно читает таблицу.
//
//   Render на free-плане останавливает сервис после ~15 минут без трафика,
//   и следующий посетитель ждёт холодный старт под минуту. Интервал в 10 минут
//   держит процесс живым.

const TARGET = 'https://vetglobal-backend.onrender.com/api/categories';

// Холодный старт Render доходит до минуты, поэтому ждём щедро: превышение
// таймаута здесь означало бы ложную тревогу, а не настоящий сбой.
const TIMEOUT_MS = 90_000;

async function ping(attempt) {
  const started = Date.now();
  try {
    const res = await fetch(TARGET, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'user-agent': 'vetglobal-keepalive' },
    });
    const ms = Date.now() - started;
    // Пустой ответ значит, что база отвечает, но таблица пуста — это не
    // падение, но и не норма, поэтому различаем в логах.
    const body = res.ok ? await res.text() : '';
    const empty = res.ok && (body === '[]' || body.length < 3);
    return { ok: res.ok, status: res.status, ms, attempt, empty };
  } catch (err) {
    return { ok: false, status: 0, ms: Date.now() - started, attempt, error: String(err) };
  }
}

async function keepAlive() {
  let r = await ping(1);
  // Одна повторная попытка: первый запрос часто попадает в холодный старт
  // и может оборваться, хотя сервис при этом уже поднимается.
  if (!r.ok) r = await ping(2);
  const line = JSON.stringify({ target: TARGET, ...r });
  if (r.ok) console.log('keepalive ok', line);
  else console.error('keepalive FAILED', line);
  return r;
}

export default {
  async scheduled(_event, _env, ctx) {
    ctx.waitUntil(keepAlive());
  },

  // Тот же пинг по запросу — чтобы проверить вручную, не дожидаясь расписания.
  async fetch() {
    const r = await keepAlive();
    return new Response(JSON.stringify(r, null, 2), {
      status: r.ok ? 200 : 503,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  },
};
