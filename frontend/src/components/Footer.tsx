'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n';

export function Footer() {
  const { tt } = useI18n();
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <div className="font-heading text-lg font-extrabold">VetGlobal</div>
          <p className="mt-2 text-sm text-ink-muted">
            {tt('B2B-маркетплейс ветеринарных препаратов, кормов и вакцин.', 'Veterinariya preparatlari, ozuqa va vaksinalar B2B-marketpleysi.')}
          </p>
        </div>
        <div>
          <div className="mb-3 font-semibold">{tt('Платформа', 'Platforma')}</div>
          <ul className="space-y-2 text-sm text-ink-muted">
            <li><Link href="/catalog" className="hover:text-teal-700">{tt('Каталог', 'Katalog')}</Link></li>
            <li><Link href="/promotions" className="hover:text-teal-700">{tt('Акции', 'Aksiyalar')}</Link></li>
            <li><Link href="/suppliers" className="hover:text-teal-700">{tt('Поставщики', 'Yetkazib beruvchilar')}</Link></li>
          </ul>
        </div>
        <div>
          <div className="mb-3 font-semibold">{tt('Информация', 'Maʼlumot')}</div>
          <ul className="space-y-2 text-sm text-ink-muted">
            <li><Link href="/blog" className="hover:text-teal-700">{tt('Блог', 'Blog')}</Link></li>
            <li><Link href="/consult" className="hover:text-teal-700">{tt('Ветконсультация', 'Vet-konsultatsiya')}</Link></li>
          </ul>
        </div>
        <div>
          <div className="mb-3 font-semibold">{tt('Контакты', 'Aloqa')}</div>
          <p className="text-sm text-ink-muted">{tt('Ташкент, Узбекистан', 'Toshkent, Oʻzbekiston')}<br />info@vetglobal.uz</p>
        </div>
      </div>
      <div className="border-t border-slate-100 py-4 text-center text-xs text-ink-subtle">
        © {new Date().getFullYear()} VetGlobal. {tt('Все права защищены.', 'Barcha huquqlar himoyalangan.')}
      </div>
    </footer>
  );
}
