// Server-side data fetching (SSR / metadata / sitemap).
//
// Адрес API перебирается по списку кандидатов. Так сделано потому, что
// API_INTERNAL_URL имеет смысл только внутри docker-сети
// (http://backend:8000/api) — в облаке такого хоста не существует. Если эта
// переменная попадает в окружение Vercel, все серверные запросы молча падают:
// sitemap остаётся без товаров и статей, а страницы — без метаданных.
// Поэтому на Vercel внутренний адрес пропускаем.

const PUBLIC_FALLBACK = 'https://vetglobal-backend.onrender.com/api';

// Похож ли адрес на внутрисетевой (docker-хост, localhost) — снаружи он мёртв.
function isInternalHost(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return !hostname.includes('.') || hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return true; // неразбираемый адрес пробовать не стоит
  }
}

function candidates(): string[] {
  const internal = process.env.API_INTERNAL_URL;
  const publicUrl = process.env.NEXT_PUBLIC_API_URL;
  const onVercel = !!process.env.VERCEL;

  const list = [
    // В облаке внутренний адрес пропускаем; в docker-сети он самый быстрый.
    ...(internal && !(onVercel && isInternalHost(internal)) ? [internal] : []),
    ...(publicUrl ? [publicUrl] : []),
    PUBLIC_FALLBACK,
  ];
  return [...new Set(list.map((u) => u.replace(/\/$/, '')))];
}

// Таймаут на попытку: у серверной функции свой лимит времени, и висеть в
// ожидании спящего бэкенда нельзя — лучше отдать страницу без метаданных.
const TIMEOUT_MS = 7000;

export async function serverFetch<T = any>(path: string, revalidate = 60): Promise<T | null> {
  for (const base of candidates()) {
    try {
      const res = await fetch(`${base}${path}`, {
        next: { revalidate },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) continue;
      return (await res.json()) as T;
    } catch {
      // Пробуем следующего кандидата; если не осталось — вернём null,
      // и вызывающий код отдаст безопасное значение по умолчанию.
    }
  }
  return null;
}

export const SITE_URL = process.env.SITE_URL ?? 'https://vet-global.vercel.app';
