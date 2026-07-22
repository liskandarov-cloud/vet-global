'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, Star, Package } from 'lucide-react';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

interface Seller {
  id: string;
  company?: string;
  description?: string;
  isVerified: boolean;
  isDemo?: boolean;
  rating: number;
  reviewsCount: number;
  productsCount: number;
}

export default function SuppliersPage() {
  const { tt } = useI18n();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/sellers', { params: { verifiedOnly: true } }).then((r) => setSellers(r.data)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-8">
        <span className="eyebrow"><ShieldCheck size={14} /> {tt('Доверие', 'Ishonch')}</span>
        <h1 className="mt-3 section-title">{tt('Проверенные поставщики', 'Tekshirilgan yetkazib beruvchilar')}</h1>
        <p className="mt-2 text-ink-muted">{tt('Компании, прошедшие проверку документов и лицензий.', 'Hujjatlar va litsenziyalar tekshiruvidan oʻtgan kompaniyalar.')}</p>
      </div>
      {loading ? (
        <div className="py-20 text-center text-ink-subtle">{tt('Загрузка…', 'Yuklanmoqda…')}</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sellers.map((s) => (
            <Link key={s.id} href={`/suppliers/${s.id}`} className="card card-hover p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-teal-600 to-emerald-500 font-heading text-lg font-bold text-white">
                  {(s.company ?? 'V').charAt(0)}
                </span>
                <div className="flex items-center gap-1 font-heading text-lg font-bold">
                  <span className="line-clamp-1">{s.company ?? tt('Поставщик', 'Yetkazib beruvchi')}</span>
                  {s.isVerified && <ShieldCheck size={18} className="shrink-0 text-teal-700" />}
                  {s.isDemo && (
                    <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                      {tt('демо', 'demo')}
                    </span>
                  )}
                </div>
              </div>
              {s.description && <p className="mt-3 line-clamp-2 text-sm text-ink-muted">{s.description}</p>}
              <div className="mt-4 flex gap-4 text-sm text-ink-muted">
                <span className="flex items-center gap-1"><Star size={14} className="fill-amber-400 text-amber-400" />{s.rating.toFixed(1)}</span>
                <span className="flex items-center gap-1"><Package size={14} />{s.productsCount} {tt('товаров', 'mahsulot')}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
