'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { EMAIL, PHONE, PHONE_DISPLAY, TG_BOT, TG_CHANNEL } from '@/lib/contacts';

export function Footer() {
  const { tt } = useI18n();
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <div className="font-heading text-lg font-extrabold">VetHub</div>
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
            <li><Link href="/consult" className="hover:text-teal-700">{tt('Ветконсультация', 'Vet maslahat')}</Link></li>
            <li><Link href="/legal/terms" className="hover:text-teal-700">{tt('Публичная оферта', 'Ommaviy oferta')}</Link></li>
            <li><Link href="/legal/privacy" className="hover:text-teal-700">{tt('Политика конфиденциальности', 'Maxfiylik siyosati')}</Link></li>
            <li><Link href="/legal/sellers" className="hover:text-teal-700">{tt('Оферта для продавцов', 'Sotuvchilar uchun oferta')}</Link></li>
          </ul>
        </div>
        <div>
          <div className="mb-3 font-semibold">{tt('Контакты', 'Aloqa')}</div>
          <ul className="space-y-2 text-sm text-ink-muted">
            <li><a href={`tel:${PHONE}`} className="hover:text-teal-700">{PHONE_DISPLAY}</a></li>
            <li><a href={`mailto:${EMAIL}`} className="hover:text-teal-700">{EMAIL}</a></li>
            <li><a href={`https://t.me/${TG_BOT}`} target="_blank" rel="noopener noreferrer" className="hover:text-teal-700">Telegram: @{TG_BOT}</a></li>
            <li><a href={`https://t.me/${TG_CHANNEL}`} target="_blank" rel="noopener noreferrer" className="hover:text-teal-700">{tt('Канал', 'Kanal')}: @{TG_CHANNEL}</a></li>
            <li>{tt('Ташкент, Узбекистан', 'Toshkent, Oʻzbekiston')}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-100 py-4 text-center text-xs text-ink-subtle">
        © {new Date().getFullYear()} VetHub. {tt('Все права защищены.', 'Barcha huquqlar himoyalangan.')}
      </div>
    </footer>
  );
}
