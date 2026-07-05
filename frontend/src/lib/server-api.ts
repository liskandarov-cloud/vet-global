// Server-side data fetching (SSR / metadata / sitemap). Uses the internal API
// URL reachable from the server (the frontend container), not the browser one.
const INTERNAL =
  process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'https://vetglobal-backend.onrender.com/api';

export async function serverFetch<T = any>(path: string, revalidate = 60): Promise<T | null> {
  try {
    const res = await fetch(`${INTERNAL}${path}`, { next: { revalidate } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const SITE_URL = process.env.SITE_URL ?? 'https://vet-global.vercel.app';
