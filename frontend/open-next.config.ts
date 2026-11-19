// Конфигурация адаптера Cloudflare для фронтенда VetHub.
//
// Кэш ISR выносится в KV: серверные запросы к API идут через serverFetch с
// revalidate = 60, и без общего хранилища каждая изоляция Worker'а
// пересчитывала бы страницы сама, дёргая бэкенд на free-плане Render.
import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import kvIncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache';
import memoryQueue from '@opennextjs/cloudflare/overrides/queue/memory-queue';
import { withRegionalCache } from '@opennextjs/cloudflare/overrides/incremental-cache/regional-cache';

// Очередь обязательна для ISR: без неё устаревшая страница отдаётся как STALE
// бесконечно — перестройка ставится в пустую очередь и не происходит. Так
// карта сайта застряла с нулём товаров, собранная, когда API не ответил.
// Очередь в памяти перестраивает страницу запросом воркера к самому себе
// (привязка WORKER_SELF_REFERENCE в wrangler.jsonc).
// shortcut: дедупликация только в пределах изоляции — при большом трафике
// перейти на doQueue (Durable Objects).
// Скорость готовых страниц. Медиана HTML была на уровне статики, но холодный
// изолят поднимал весь рантайм Next ради страницы, которая уже лежит в кэше, —
// отсюда всплески до 1,5 с. Перехват отдаёт готовую страницу, не запуская
// Next (несовместим только с PPR, его здесь нет); региональный кэш держит
// записи KV ближе к воркеру, чтобы не читать KV на каждый запрос.
export default defineCloudflareConfig({
  incrementalCache: withRegionalCache(kvIncrementalCache, { mode: 'long-lived' }),
  queue: memoryQueue,
  enableCacheInterception: true,
});
