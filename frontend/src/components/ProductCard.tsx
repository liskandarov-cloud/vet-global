'use client';

import Link from 'next/link';
import { ShieldCheck, FileText, Star, ShoppingCart, Heart, Scale } from 'lucide-react';
import { toast } from 'sonner';
import { Product } from '@/lib/types';
import { useCart, useFavorites, useAuth } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import { formatMoney } from '@/lib/utils';
import { applyPromotion } from '@/lib/pricing';

const PLACEHOLDER = '/products/vaccine.jpg';

export function ProductCard({ product }: { product: Product }) {
  const { t, tt, lang } = useI18n();
  const add = useCart((s) => s.add);
  const favIds = useFavorites((s) => s.ids);
  const toggleFav = useFavorites((s) => s.toggle);
  const user = useAuth((s) => s.user);
  const isFav = favIds.includes(product.id);

  const displayName = lang === 'uz' && product.nameUz ? product.nameUz : product.name;
  // Минимум берётся из того же предложения, что и цена «от». Раньше карточка
  // показывала минимум товара, а заказ требовал минимум предложения: покупатель
  // добавлял одну упаковку и получал отказ уже в корзине.
  const minOrder = product.offerMinOrder ?? product.minOrder;
  const image = product.images?.[0] ?? PLACEHOLDER;

  const onFav = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.error(tt('Войдите, чтобы добавить в избранное', 'Sevimlilarga qoʻshish uchun kiring'));
      return;
    }
    toggleFav(product.id);
  };

  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/50">
      <button
        onClick={onFav}
        aria-label={tt('В избранное', 'Sevimlilarga')}
        className={`absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-full bg-white/90 shadow-sm transition-colors ${isFav ? 'text-red-500' : 'text-slate-400 hover:text-red-500'}`}
      >
        <Heart size={16} className={isFav ? 'fill-red-500' : ''} />
      </button>
      <Link href={`/products/${product.id}`} className="relative block aspect-square overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {product.isPromotion && (
            <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold text-white">{tt('Акция', 'Aksiya')}</span>
          )}
          {product.isNew && (
            <span className="rounded-md bg-teal-600 px-2 py-0.5 text-xs font-semibold text-white">{tt('Новинка', 'Yangi')}</span>
          )}
          {!product.inStock && (
            <span className="rounded-md bg-slate-700 px-2 py-0.5 text-xs font-semibold text-white">{tt('Под заказ', 'Buyurtma asosida')}</span>
          )}
        </div>
        {product.certificates?.length > 0 && (
          <span className="absolute bottom-2 right-2 grid h-7 w-7 place-items-center rounded-md bg-white/90 text-teal-700 shadow-sm" title={t('product.certificate')}>
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
            {displayName}
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

        <div className="mt-3 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            {product.offersCount && product.offersCount > 0 && product.minPrice != null ? (
              <>
                <div className="text-[11px] leading-none text-ink-subtle">{tt('от', 'dan')}</div>
                <div className="whitespace-nowrap font-heading text-lg font-bold text-ink">{formatMoney(applyPromotion(product.minPrice, product.promoPercent))}</div>
              </>
            ) : (
              <div className="whitespace-nowrap font-heading text-lg font-bold text-ink">{formatMoney(applyPromotion(product.price, product.promoPercent))}</div>
            )}
            {/* Цена до акции зачёркнутой: скидка без исходной цены — это просто
                другая цена, и покупатель не видит, что она снижена. */}
            {!!product.promoPercent && product.promoPercent > 0 && (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-ink-subtle line-through">{formatMoney(product.minPrice ?? product.price)}</span>
                <span className="rounded bg-red-50 px-1 font-medium text-red-600">−{product.promoPercent}%</span>
              </div>
            )}
            {product.offersCount && product.offersCount > 1 ? (
              <div className="text-xs font-medium text-teal-700">{product.offersCount} {tt('предложений', 'taklif')}</div>
            ) : (
              <div className="text-xs text-ink-subtle">{t('product.minOrder')}: {minOrder}</div>
            )}
          </div>
          {product.offersCount && product.offersCount > 1 ? (
            <Link href={`/products/${product.id}`} className="btn-primary w-full shrink-0 sm:w-auto !px-3 !py-2" aria-label={tt('Сравнить цены', 'Narxlarni solishtirish')}>
              <Scale size={16} />
            </Link>
          ) : (
            <button
              className="btn-primary w-full shrink-0 sm:w-auto !px-3 !py-2"
              onClick={() => {
                add(
                  {
                    productId: product.id,
                    name: displayName,
                    // В корзину кладётся цена с акцией: сумма заказа считается
                    // сервером по тому же правилу, и иначе корзина обещала бы
                    // одну цену, а списалась другая.
                    price: applyPromotion(product.minPrice ?? product.price, product.promoPercent),
                    minOrder,
                    image,
                  },
                  minOrder,
                );
                toast.success(tt('Добавлено в корзину', 'Savatga qoʻshildi'));
              }}
              aria-label={t('product.addToCart')}
            >
              <ShoppingCart size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
