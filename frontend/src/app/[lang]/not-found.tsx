'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n';

// Своя страница 404 вместо английской заглушки Next.
export default function NotFound() {
  const { tt } = useI18n();
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 text-center">
      <div className="font-heading text-5xl font-bold text-teal-700">404</div>
      <p className="mt-4 text-ink-muted">{tt('Такой страницы нет', 'Bunday sahifa yoʻq')}</p>
      <div className="mt-6 flex justify-center gap-2">
        <Link href="/" className="btn-secondary">{tt('На главную', 'Bosh sahifa')}</Link>
        <Link href="/catalog" className="btn-ghost">{tt('Каталог', 'Katalog')}</Link>
      </div>
    </div>
  );
}
