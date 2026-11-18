// Адрес push-подписки — только сервис уведомлений браузера.
//
// Адрес приходил от клиента как есть, а сервер потом сам отправляет на него
// POST при каждом уведомлении. Любой зарегистрированный пользователь мог
// подставить внутренний адрес (http://localhost:…, служебные сети хостинга) и
// заставить API ходить туда по своему сигналу — серверная подделка запросов
// (SSRF). Настоящие подписки браузеров ведут только на эти сервисы.

const PUSH_HOSTS = [
  'fcm.googleapis.com', // Chrome, Edge, Opera, Android
  'android.googleapis.com',
  'updates.push.services.mozilla.com', // Firefox
  'web.push.apple.com', // Safari
];
const PUSH_HOST_SUFFIXES = ['.push.services.mozilla.com', '.push.apple.com', '.notify.windows.com'];

export function isPushEndpointAllowed(endpoint: unknown): boolean {
  if (typeof endpoint !== 'string' || endpoint.length > 2048) return false;
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return false;
  const host = url.hostname.toLowerCase();
  return PUSH_HOSTS.includes(host) || PUSH_HOST_SUFFIXES.some((s) => host.endsWith(s));
}
