'use client';

import Link from 'next/link';

export function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <div className="font-heading text-lg font-extrabold">VetGlobal</div>
          <p className="mt-2 text-sm text-ink-muted">
            B2B-маркетплейс ветеринарных препаратов, кормов и вакцин.
          </p>
        </div>
        <div>
          <div className="mb-3 font-semibold">Платформа</div>
          <ul className="space-y-2 text-sm text-ink-muted">
            <li><Link href="/catalog" className="hover:text-teal-700">Каталог</Link></li>
            <li><Link href="/promotions" className="hover:text-teal-700">Акции</Link></li>
            <li><Link href="/suppliers" className="hover:text-teal-700">Поставщики</Link></li>
          </ul>
        </div>
        <div>
          <div className="mb-3 font-semibold">Информация</div>
          <ul className="space-y-2 text-sm text-ink-muted">
            <li><Link href="/blog" className="hover:text-teal-700">Блог</Link></li>
            <li><Link href="/consult" className="hover:text-teal-700">Ветконсультация</Link></li>
          </ul>
        </div>
        <div>
          <div className="mb-3 font-semibold">Контакты</div>
          <p className="text-sm text-ink-muted">Ташкент, Узбекистан<br />info@vetglobal.uz</p>
        </div>
      </div>
      <div className="border-t border-slate-100 py-4 text-center text-xs text-ink-subtle">
        © {new Date().getFullYear()} VetGlobal. Все права защищены.
      </div>
    </footer>
  );
}
