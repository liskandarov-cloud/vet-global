'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldCheck,
  FileText,
  Star,
  ShoppingCart,
  Minus,
  Plus,
  Truck,
  BadgeCheck,
  Pill,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useCart } from '@/lib/store';
import { Product, Offer } from '@/lib/types';
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
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api.get(`/products/${id}`).then((r) => {
      const p: Product = r.data;
      setProduct(p);
      const cheapest = p.offers?.[0]; // офферы приходят отсортированными по цене
      setSelectedOfferId(cheapest?.id ?? null);
      setQty(cheapest?.minOrder ?? p.minOrder ?? 1);
    });
    api.get('/reviews', { params: { productId: id } }).then((r) => setReviews(r.data)).catch(() => {});
  }, [id]);

  if (!product) return <div className="py-24 text-center text-ink-subtle">{t('common.loading')}</div>;

  const offers = product.offers ?? [];
  const selectedOffer: Offer | undefined =
    offers.find((o) => o.id === selectedOfferId) ?? offers[0];

  // Эффективная цена/минимум/наличие: из выбранного оффера, иначе — базовый товар (легаси).
  const unitPrice = unitPriceForQty(selectedOffer, qty) ?? product.price;
  const effMinOrder = selectedOffer?.minOrder ?? product.minOrder;
  const effInStock = selectedOffer ? selectedOffer.inStock : product.inStock;
  const sellerName = selectedOffer?.seller?.company ?? product.seller?.company ?? undefined;

  const addToCart = () => {
    add(
      {
        productId: product.id,
        offerId: selectedOffer?.id,
        sellerName,
        name: product.name,
        price: unitPrice,
        minOrder: effMinOrder,
        image: images[0],
      },
      qty,
    );
    toast.success('Добавлено в корзину');
  };

  const selectOffer = (o: Offer) => {
    setSelectedOfferId(o.id);
    setQty((q) => Math.max(o.minOrder, q));
  };

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
            {offers.length > 0 && (
              <div className="mb-1 text-xs font-medium text-teal-700">
                {selectedOffer?.seller?.company
                  ? `Предложение: ${selectedOffer.seller.company}`
                  : 'Лучшее предложение'}
                {offers.length > 1 && ` · всего ${offers.length} поставщиков`}
              </div>
            )}
            <div className="font-heading text-4xl font-extrabold text-gradient">{formatMoney(unitPrice)}</div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-subtle">
              <span>{t('product.minOrder')}: {effMinOrder}</span>
              <span>·</span>
              <span>{effInStock ? 'В наличии' : 'Под заказ'}</span>
              {selectedOffer?.leadTimeDays != null && (<><span>·</span><span className="inline-flex items-center gap-1"><Truck size={13} /> {selectedOffer.leadTimeDays} дн.</span></>)}
              {selectedOffer?.isRx && (<><span>·</span><span className="inline-flex items-center gap-1 text-amber-600"><Pill size={13} /> по рецепту</span></>)}
            </div>
            {selectedOffer?.priceBreaks && selectedOffer.priceBreaks.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                {selectedOffer.priceBreaks.map((b, i) => (
                  <span key={i} className={`rounded-md border px-2 py-0.5 ${qty >= b.minQty ? 'border-teal-300 bg-teal-50 text-teal-700' : 'border-slate-200 text-ink-subtle'}`}>
                    от {b.minQty} шт — {formatMoney(b.price)}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-4 flex items-center gap-3">
              <div className="flex items-center rounded-lg border border-slate-200">
                <button className="p-2.5" onClick={() => setQty((q) => Math.max(effMinOrder, q - 1))}><Minus size={16} /></button>
                <input className="w-14 text-center outline-none" value={qty} onChange={(e) => setQty(Math.max(effMinOrder, Number(e.target.value) || effMinOrder))} />
                <button className="p-2.5" onClick={() => setQty((q) => q + 1)}><Plus size={16} /></button>
              </div>
              <button className="btn-primary flex-1" onClick={addToCart}>
                <ShoppingCart size={18} /> {t('product.addToCart')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Сравнение предложений поставщиков */}
      {offers.length > 0 && (
        <section className="mt-12">
          <div className="mb-4 flex items-center gap-2">
            <Layers size={20} className="text-teal-700" />
            <h2 className="font-heading text-2xl font-bold">Предложения поставщиков</h2>
            <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">{offers.length}</span>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-ink-subtle">
                <tr>
                  <th className="px-4 py-3 font-medium">Поставщик</th>
                  <th className="px-4 py-3 font-medium">Цена / ед.</th>
                  <th className="px-4 py-3 font-medium">Наличие</th>
                  <th className="px-4 py-3 font-medium">Срок</th>
                  <th className="px-4 py-3 font-medium">Мин. заказ</th>
                  <th className="px-4 py-3 font-medium">Гарантии</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {offers.map((o, idx) => {
                  const isSel = o.id === selectedOffer?.id;
                  const isCheapest = idx === 0;
                  return (
                    <tr
                      key={o.id}
                      onClick={() => selectOffer(o)}
                      className={`cursor-pointer border-t border-slate-100 transition-colors ${isSel ? 'bg-teal-50/60' : 'hover:bg-slate-50'}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <input type="radio" checked={isSel} onChange={() => selectOffer(o)} className="accent-teal-600" />
                          <Link href={`/suppliers/${o.sellerId}`} onClick={(e) => e.stopPropagation()} className="font-medium hover:text-teal-700">
                            {o.seller?.company ?? 'Поставщик'}
                          </Link>
                          {o.seller?.isVerified && <ShieldCheck size={14} className="text-teal-700" />}
                        </div>
                        {o.seller && (o.seller.rating ?? 0) > 0 && (
                          <div className="mt-0.5 flex items-center gap-0.5 text-xs text-ink-subtle">
                            <Star size={11} className="fill-amber-400 text-amber-400" /> {Number(o.seller.rating).toFixed(1)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-heading font-bold">{formatMoney(o.price)}</span>
                        {isCheapest && offers.length > 1 && (
                          <span className="ml-2 rounded bg-teal-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">мин. цена</span>
                        )}
                        {o.netTermDays ? (
                          <div className="text-xs text-ink-subtle">отсрочка {o.netTermDays} дн.</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        {o.inStock ? (
                          <span className="text-teal-700">{o.stockQty != null ? `${o.stockQty} шт` : 'В наличии'}</span>
                        ) : (
                          <span className="text-ink-subtle">Под заказ</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-ink-muted">{o.leadTimeDays != null ? `${o.leadTimeDays} дн.` : '—'}</td>
                      <td className="px-4 py-3 text-ink-muted">{o.minOrder} шт</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {o.certVerified && (
                            <span className="inline-flex items-center gap-1 rounded bg-teal-50 px-1.5 py-0.5 text-[11px] text-teal-700"><BadgeCheck size={12} /> сертиф.</span>
                          )}
                          {o.isRx && (
                            <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-700"><Pill size={12} /> Rx</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          className="btn-outline !px-3 !py-1.5 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            add(
                              {
                                productId: product.id,
                                offerId: o.id,
                                sellerName: o.seller?.company ?? undefined,
                                name: product.name,
                                price: unitPriceForQty(o, o.minOrder) ?? o.price,
                                minOrder: o.minOrder,
                                image: images[0],
                              },
                              o.minOrder,
                            );
                            toast.success(`Добавлено: ${o.seller?.company ?? 'поставщик'}`);
                          }}
                        >
                          <ShoppingCart size={14} /> В корзину
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-ink-subtle">Цены указаны за единицу. Итог рассчитывается с учётом объёмных скидок выбранного поставщика.</p>
        </section>
      )}

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

// Цена за единицу выбранного оффера с учётом объёмных скидок (price breaks).
function unitPriceForQty(offer: Offer | undefined, qty: number): number | undefined {
  if (!offer) return undefined;
  let price = offer.price;
  const breaks = [...(offer.priceBreaks ?? [])].sort((a, b) => a.minQty - b.minQty);
  for (const b of breaks) if (qty >= b.minQty) price = b.price;
  return price;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-ink-subtle">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
