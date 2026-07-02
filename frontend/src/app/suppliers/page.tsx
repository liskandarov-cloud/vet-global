'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, Star, Package } from 'lucide-react';
import { api } from '@/lib/api';

interface Seller {
  id: string;
  company?: string;
  description?: string;
  isVerified: boolean;
  rating: number;
  reviewsCount: number;
  productsCount: number;
}

export default function SuppliersPage() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/sellers', { params: { verifiedOnly: true } }).then((r) => setSellers(r.data)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="mb-2 font-heading text-3xl font-extrabold">Проверенные поставщики</h1>
      <p className="mb-6 text-ink-muted">Компании, прошедшие проверку документов и лицензий.</p>
      {loading ? (
        <div className="py-20 text-center text-ink-subtle">Загрузка…</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sellers.map((s) => (
            <Link key={s.id} href={`/suppliers/${s.id}`} className="card p-5 transition-colors hover:border-teal-200">
              <div className="flex items-center gap-2">
                <span className="font-heading text-lg font-bold">{s.company ?? 'Поставщик'}</span>
                {s.isVerified && <ShieldCheck size={18} className="text-teal-700" />}
              </div>
              {s.description && <p className="mt-2 line-clamp-2 text-sm text-ink-muted">{s.description}</p>}
              <div className="mt-4 flex gap-4 text-sm text-ink-muted">
                <span className="flex items-center gap-1"><Star size={14} className="fill-amber-400 text-amber-400" />{s.rating.toFixed(1)}</span>
                <span className="flex items-center gap-1"><Package size={14} />{s.productsCount} товаров</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
