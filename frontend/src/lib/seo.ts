import { SITE_URL } from './server-api';

// Канонический адрес языковой версии и ссылки на обе (hreflang): узбекская
// страница — самостоятельная, а не копия русской.
export function langAlternates(lang: string, path: string) {
  const ru = `${SITE_URL}${path}`;
  const uz = `${SITE_URL}/uz${path}`;
  return { canonical: lang === 'uz' ? uz : ru, languages: { ru, uz, 'x-default': ru } };
}

export function absoluteUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}
