// VetGlobal PWA service worker — офлайн-оболочка + runtime-кэш статики.
const CACHE = 'vg-v1';
const OFFLINE_URL = '/offline';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.add(OFFLINE_URL).catch(() => {})).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // не трогаем API/сторонние домены

  // Навигация: сеть, при отказе — офлайн-страница.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Статика: cache-first с дозаписью.
  if (['style', 'script', 'image', 'font'].includes(req.destination)) {
    e.respondWith(
      caches.match(req).then((cached) =>
        cached ||
        fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        }).catch(() => cached),
      ),
    );
  }
});

// Web-push: показать уведомление.
self.addEventListener('push', (e) => {
  let data = { title: 'VetGlobal', body: '', url: '/' };
  try { data = { ...data, ...e.data.json() }; } catch (_) {}
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon.svg',
      badge: '/icon.svg',
      data: { url: data.url || '/' },
    }),
  );
});

// Клик по уведомлению: открыть/сфокусировать нужную страницу.
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) { if (c.url.includes(url) && 'focus' in c) return c.focus(); }
      return self.clients.openWindow(url);
    }),
  );
});
