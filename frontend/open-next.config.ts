// Конфигурация адаптера Cloudflare для фронтенда VetGlobal.
//
// Кэш ISR выносится в KV: серверные запросы к API идут через serverFetch с
// revalidate = 60, и без общего хранилища каждая изоляция Worker'а
// пересчитывала бы страницы сама, дёргая бэкенд на free-плане Render.
import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import kvIncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache';

export default defineCloudflareConfig({
  incrementalCache: kvIncrementalCache,
});
