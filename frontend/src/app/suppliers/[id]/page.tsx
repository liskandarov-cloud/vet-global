'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ShieldCheck, Star } from 'lucide-react';
import { api } from '@/lib/api';
import { Product } from '@/lib/types';
import { ProductCard } from '@/components/ProductCard';

interface Seller {
  id: string;
  company?: string;
  description?: string;
  isVerified: boolean;
  rating: number;
  reviewsCount: number;
  productsCount: number;
  createdAt: string;
}

export default function SupplierPage() {
  const { id } = useParams<{ id: string }>();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (!id) return;
    api.get(`/sellers/${id}`).then((r) => setSeller(r.data));
    api.get('/products', { params: { sellerId: id, limit: 24 } }).then((r) => setProducts(r.data.products));
  }, [id]);

  if (!seller) return <div className="py-24 text-center text-ink-subtle">Загрузка…</div>;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="card overflow-hidden p-0">
        <div className="flex items-center gap-4 bg-gradient-to-r from-teal-600 to-emerald-500 p-6 text-white">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/20 font-heading text-2xl font-extrabold">
            {(seller.company ?? 'V').charAt(0)}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-3xl font-extrabold">{seller.company ?? 'Поставщик'}</h1>
              {seller.isVerified && <ShieldCheck size={22} />}
            </div>
            {seller.isVerified && <span className="mt-1 inline-block rounded-full bg-white/20 px-3 py-0.5 text-xs font-medium">Проверенный поставщик</span>}
          </div>
        </div>
        <div className="p-6">
        {seller.description && <p className="text-ink-muted">{seller.description}</p>}
        <div className="mt-4 flex gap-6 text-sm text-ink-muted">
          <span className="flex items-center gap-1"><Star size={15} className="fill-amber-400 text-amber-400" />{seller.rating.toFixed(1)} ({seller.reviewsCount})</span>
          <span>{seller.productsCount} товаров</span>
          <span>С нами с {new Date(seller.createdAt).toLocaleDateString('ru-RU')}</span>
        </div>
        </div>
      </div>

      <h2 className="mb-4 mt-8 font-heading text-2xl font-bold">Ассортимент</h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {products.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </div>
  );
}
