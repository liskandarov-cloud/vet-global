'use client';

import Link from 'next/link';
import { ShieldCheck, FileText, Star, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { Product } from '@/lib/types';
import { useCart } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import { formatMoney } from '@/lib/utils';

const PLACEHOLDER =
  'https://images.unsplash.com/photo-1547908068-35ea7b47a21d?crop=entropy&cs=srgb&fm=jpg&q=85&w=600';

export function ProductCard({ product }: { product: Product }) {
  const { t } = useI18n();
  const add = useCart((s) => s.add);

  const image = product.images?.[0] ?? PLACEHOLDER;

  return (
    <div className="group overflow-hidden rounded-xl border border-slate-200 bg-white transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/50">
      <Link href={`/products/${product.id}`} className="relative block aspect-square overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {product.isPromotion && (
            <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold text-white">Акция</span>
          )}
          {product.isNew && (
            <span className="rounded-md bg-teal-600 px-2 py-0.5 text-xs font-semibold text-white">Новинка</span>
          )}
          {!product.inStock && (
            <span className="rounded-md bg-slate-700 px-2 py-0.5 text-xs font-semibold text-white">Под заказ</span>
          )}
        </div>
        {product.certificates?.length > 0 && (
          <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-md bg-white/90 text-teal-700 shadow-sm" title={t('product.certificate')}>
            <FileText size={15} />
          </span>
        )}
      </Link>

      <div className="p-4">
        {product.seller?.isVerified && (
          <div className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-teal-700">
            <ShieldCheck size={13} /> {t('product.verified')}
          </div>
        )}
        <Link href={`/products/${product.id}`}>
          <h3 className="line-clamp-2 min-h-[2.5rem] font-semibold leading-snug hover:text-teal-700">
            {product.name}
          </h3>
        </Link>
        <div className="mt-1 text-xs text-ink-subtle">
          {product.manufacturer ?? product.activeSubstance ?? ''}
        </div>

        <div className="mt-2 flex items-center gap-1 text-xs text-ink-muted">
          {product.rating > 0 && (
            <>
              <Star size={13} className="fill-amber-400 text-amber-400" />
              {product.rating.toFixed(1)} ({product.reviewsCount})
            </>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div>
            <div className="font-heading text-lg font-bold text-ink">{formatMoney(product.price)}</div>
            <div className="text-xs text-ink-subtle">{t('product.minOrder')}: {product.minOrder}</div>
          </div>
          <button
            className="btn-primary !px-3 !py-2"
            onClick={() => {
              add(
                {
                  productId: product.id,
                  name: product.name,
                  price: product.price,
                  minOrder: product.minOrder,
                  image,
                },
                product.minOrder,
              );
              toast.success('Добавлено в корзину');
            }}
            aria-label={t('product.addToCart')}
          >
            <ShoppingCart size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
