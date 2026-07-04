'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, FileText, Star, ShoppingCart, Minus, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useCart } from '@/lib/store';
import { Product } from '@/lib/types';
import { ProductCard } from '@/components/ProductCard';
import { formatMoney } from '@/lib/utils';

interface Review { id: string; buyerName: string; rating: number; comment: string; createdAt: string }

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const add = useCart((s) => s.add);

  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    if (!id) return;
    api.get(`/products/${id}`).then((r) => {
      setProduct(r.data);
      setQty(r.data.minOrder ?? 1);
    });
    api.get('/reviews', { params: { productId: id } }).then((r) => setReviews(r.data)).catch(() => {});
  }, [id]);

  if (!product) return <div className="py-24 text-center text-ink-subtle">{t('common.loading')}</div>;

  const images = product.images?.length
    ? product.images
    : ['https://images.unsplash.com/photo-1547908068-35ea7b47a21d?crop=entropy&cs=srgb&fm=jpg&q=85&w=800'];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <nav className="mb-5 flex items-center gap-2 text-sm text-ink-subtle">
        <Link href="/" className="hover:text-teal-700">Главная</Link>
        <span>/</span>
        <Link href="/catalog" className="hover:text-teal-700">{t('nav.catalog')}</Link>
        {product.category && (<><span>/</span><span className="text-ink-muted">{product.category.name}</span></>)}
      </nav>
      <div className="grid gap-10 md:grid-cols-2">
        {/* Gallery */}
        <div className="md:sticky md:top-20 md:self-start">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={images[activeImg]} alt={product.name} className="aspect-square w-full object-cover" />
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={`h-16 w-16 overflow-hidden rounded-lg border-2 ${i === activeImg ? 'border-teal-500' : 'border-transparent'}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <div className="flex gap-2">
            {product.isPromotion && <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold text-white">Акция</span>}
            {product.isNew && <span className="rounded-md bg-teal-600 px-2 py-0.5 text-xs font-semibold text-white">Новинка</span>}
          </div>
          <h1 className="mt-2 font-heading text-3xl font-extrabold">{product.name}</h1>

          {product.rating > 0 && (
            <div className="mt-2 flex items-center gap-1 text-sm text-ink-muted">
              <Star size={15} className="fill-amber-400 text-amber-400" />
              {product.rating.toFixed(1)} · {product.reviewsCount} отзывов
            </div>
          )}

          <div className="mt-4 space-y-1 text-sm">
            {product.activeSubstance && <Row label={t('product.substance')} value={product.activeSubstance} />}
            {product.manufacturer && <Row label={t('product.manufacturer')} value={product.manufacturer} />}
            {product.form && <Row label={t('product.form')} value={product.form} />}
          </div>

          <p className="mt-4 text-ink-muted">{product.description}</p>

          {product.certificates?.length > 0 && (
            <a href={product.certificates[0]} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-teal-700 hover:underline">
              <FileText size={16} /> {t('product.certificate')}
            </a>
          )}

          {product.seller && (
            <Link href={`/suppliers/${product.seller.id}`} className="mt-4 flex items-center gap-2 rounded-lg border border-slate-200 p-3 text-sm hover:border-teal-200">
              {product.seller.isVerified && <ShieldCheck size={16} className="text-teal-700" />}
              <span className="font-medium">{product.seller.company}</span>
            </Link>
          )}

          <div className="mt-6 rounded-2xl border border-teal-100 bg-gradient-to-br from-white to-teal-50/40 p-5 shadow-soft">
            <div className="font-heading text-4xl font-extrabold text-gradient">{formatMoney(product.price)}</div>
            <div className="mt-1 text-sm text-ink-subtle">{t('product.minOrder')}: {product.minOrder} · {product.inStock ? 'В наличии' : 'Под заказ'}</div>

            <div className="mt-4 flex items-center gap-3">
              <div className="flex items-center rounded-lg border border-slate-200">
                <button className="p-2.5" onClick={() => setQty((q) => Math.max(product.minOrder, q - 1))}><Minus size={16} /></button>
                <input className="w-14 text-center outline-none" value={qty} onChange={(e) => setQty(Math.max(product.minOrder, Number(e.target.value) || product.minOrder))} />
                <button className="p-2.5" onClick={() => setQty((q) => q + 1)}><Plus size={16} /></button>
              </div>
              <button
                className="btn-primary flex-1"
                onClick={() => {
                  add({ productId: product.id, name: product.name, price: product.price, minOrder: product.minOrder, image: images[0] }, qty);
                  toast.success('Добавлено в корзину');
                }}
              >
                <ShoppingCart size={18} /> {t('product.addToCart')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews */}
      {reviews.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 font-heading text-2xl font-bold">Отзывы</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {reviews.map((r) => (
              <div key={r.id} className="card p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{r.buyerName}</span>
                  <span className="flex items-center gap-0.5 text-amber-400">
                    {Array.from({ length: r.rating }).map((_, i) => <Star key={i} size={14} className="fill-amber-400" />)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-ink-muted">{r.comment}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Analogs */}
      {product.related && product.related.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 font-heading text-2xl font-bold">{t('product.analogs')}</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {product.related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-ink-subtle">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
