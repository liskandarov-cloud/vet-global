'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Tag } from 'lucide-react';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

interface Promo {
  id: string;
  title: string;
  description?: string;
  discountPercent: number;
  endsAt?: string;
  seller?: { company?: string };
  product?: { id: string; name: string; price: number; images: string[] };
}

export default function PromotionsPage() {
  const { tt } = useI18n();
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/promotions').then((r) => setPromos(r.data)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-8">
        <span className="eyebrow" style={{ color: '#c2410c', background: '#ffedd5', borderColor: '#fed7aa' }}>{tt('Выгодно', 'Foydali')}</span>
        <h1 className="mt-3 section-title">{tt('Акции и предложения', 'Aksiyalar va takliflar')}</h1>
      </div>
      {loading ? (
        <div className="py-20 text-center text-ink-subtle">{tt('Загрузка…', 'Yuklanmoqda…')}</div>
      ) : promos.length === 0 ? (
        <div className="py-20 text-center text-ink-subtle">{tt('Активных акций пока нет', 'Hozircha faol aksiyalar yoʻq')}</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {promos.map((p) => (
            <div key={p.id} className="card overflow-hidden">
              <div className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-white">
                <Tag size={16} />
                <span className="font-semibold">-{p.discountPercent}%</span>
                {p.endsAt && <span className="ml-auto text-xs opacity-90">{tt('до', 'gacha')} {new Date(p.endsAt).toLocaleDateString('ru-RU')}</span>}
              </div>
              <div className="p-4">
                <h3 className="font-semibold">{p.title}</h3>
                {p.description && <p className="mt-1 text-sm text-ink-muted">{p.description}</p>}
                {p.seller?.company && <p className="mt-2 text-xs text-ink-subtle">{p.seller.company}</p>}
                {p.product && (
                  <Link href={`/products/${p.product.id}`} className="mt-3 flex items-center justify-between rounded-lg border border-slate-200 p-2 text-sm hover:border-teal-200">
                    <span className="line-clamp-1">{p.product.name}</span>
                    <span className="font-semibold">{formatMoney(p.product.price)}</span>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
