'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Award } from 'lucide-react';
import { api } from '@/lib/api';
import { Product } from '@/lib/types';
import { ProductCard } from '@/components/ProductCard';

interface BrandDetail {
  name: string;
  description?: string | null;
  isSponsored: boolean;
  products: Product[];
}

export default function BrandPage() {
  const params = useParams();
  const slug = Array.isArray(params?.slug) ? params.slug[0] : (params?.slug as string);
  const [brand, setBrand] = useState<BrandDetail | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'notfound'>('loading');

  useEffect(() => {
    if (!slug) return;
    api.get(`/brands/${slug}`).then((r) => { setBrand(r.data); setStatus('ready'); }).catch(() => setStatus('notfound'));
  }, [slug]);

  if (status === 'loading') return <div className="py-24 text-center text-ink-subtle">Загрузка…</div>;
  if (status === 'notfound' || !brand) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <div className="text-ink-subtle">Бренд не найден</div>
        <Link href="/brands" className="btn-ghost mt-4"><ArrowLeft size={16} /> Бренды</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link href="/brands" className="btn-ghost mb-4"><ArrowLeft size={16} /> Бренды</Link>
      <div className="flex items-center gap-4">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-teal-50 font-heading text-2xl font-bold text-teal-700">
          {brand.name.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <h1 className="flex items-center gap-2 font-heading text-3xl font-extrabold">
            {brand.name}
            {brand.isSponsored && <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700"><Award size={12} /> Продвигается</span>}
          </h1>
          {brand.description && <p className="mt-1 text-ink-muted">{brand.description}</p>}
        </div>
      </div>

      <h2 className="mb-4 mt-8 font-heading text-xl font-bold">Товары бренда · {brand.products.length}</h2>
      {brand.products.length === 0 ? (
        <div className="py-12 text-center text-ink-subtle">Товаров пока нет</div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {brand.products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
