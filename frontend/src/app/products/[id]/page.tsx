'use client';

import { useEffect, useState, Fragment } from 'react';
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
  ChevronDown,
  ShieldAlert,
  CalendarClock,
  ClipboardCheck,
  Repeat,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useCart, useAuth } from '@/lib/store';
import { Product, Offer } from '@/lib/types';
import { ProductCard } from '@/components/ProductCard';
import { formatMoney } from '@/lib/utils';

interface Review { id: string; buyerName: string; rating: number; comment: string; createdAt: string }

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const { t, tt } = useI18n();
  const add = useCart((s) => s.add);
  const currentUser = useAuth((s) => s.user);

  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [expandedOfferId, setExpandedOfferId] = useState<string | null>(null);
  const [subInterval, setSubInterval] = useState(30);
  const [contractMap, setContractMap] = useState<Record<string, number>>({});

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

  // Контрактные (персональные) цены покупателя по этому товару.
  useEffect(() => {
    if (!id || !currentUser) { setContractMap({}); return; }
    api.get('/contract-prices/my', { params: { productId: id } }).then((r) => {
      const m: Record<string, number> = {};
      (r.data ?? []).forEach((c: any) => { m[c.offerId] = c.price; });
      setContractMap(m);
    }).catch(() => {});
  }, [id, currentUser]);

  // Эффективная цена оффера с учётом договорной цены (перебивает объёмные скидки).
  const effPrice = (o: Offer | undefined, quantity: number): number | undefined => {
    if (!o) return undefined;
    return contractMap[o.id] != null ? contractMap[o.id] : unitPriceForQty(o, quantity);
  };

  if (!product) return <div className="py-24 text-center text-ink-subtle">{t('common.loading')}</div>;

  const offers = product.offers ?? [];
  const selectedOffer: Offer | undefined =
    offers.find((o) => o.id === selectedOfferId) ?? offers[0];

  // Эффективная цена/минимум/наличие: из выбранного оффера, иначе — базовый товар (легаси).
  const unitPrice = effPrice(selectedOffer, qty) ?? product.price;
  const hasContract = selectedOffer ? contractMap[selectedOffer.id] != null : false;
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
    toast.success(tt('Добавлено в корзину', 'Savatga qoʻshildi'));
  };

  const selectOffer = (o: Offer) => {
    setSelectedOfferId(o.id);
    setQty((q) => Math.max(o.minOrder, q));
  };

  // Автопополнение: подписка на регулярную поставку выбранного оффера.
  const subscribe = async () => {
    if (!currentUser) { toast.error(tt('Войдите, чтобы оформить автопополнение', 'Avto toʻldirishni rasmiylashtirish uchun tizimga kiring')); return; }
    try {
      await api.post('/subscriptions', {
        productId: product.id,
        offerId: selectedOffer?.id,
        quantity: qty,
        intervalDays: subInterval,
      });
      toast.success(`${tt('Автопополнение оформлено: каждые', 'Avto toʻldirish rasmiylashtirildi: har')} ${subInterval} ${tt('дн.', 'kun')}`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? tt('Ошибка', 'Xatolik'));
    }
  };

  // Админ: верификация подлинности оффера.
  const verifyOffer = async (offerId: string, verified: boolean) => {
    try {
      await api.post(`/offers/${offerId}/verify`, { verified });
      setProduct((prev) =>
        prev ? { ...prev, offers: prev.offers?.map((o) => (o.id === offerId ? { ...o, certVerified: verified } : o)) } : prev,
      );
      toast.success(verified ? tt('Оффер верифицирован', 'Taklif tasdiqlandi') : tt('Верификация снята', 'Tasdiqlash bekor qilindi'));
    } catch {
      toast.error(tt('Ошибка', 'Xatolik'));
    }
  };

  const images = product.images?.length
    ? product.images
    : ['https://images.unsplash.com/photo-1547908068-35ea7b47a21d?crop=entropy&cs=srgb&fm=jpg&q=85&w=800'];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <nav className="mb-5 flex items-center gap-2 text-sm text-ink-subtle">
        <Link href="/" className="hover:text-teal-700">{tt('Главная', 'Bosh sahifa')}</Link>
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
            {product.isPromotion && <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold text-white">{tt('Акция', 'Aksiya')}</span>}
            {product.isNew && <span className="rounded-md bg-teal-600 px-2 py-0.5 text-xs font-semibold text-white">{tt('Новинка', 'Yangi')}</span>}
          </div>
          <h1 className="mt-2 font-heading text-3xl font-extrabold">{product.name}</h1>

          {product.rating > 0 && (
            <div className="mt-2 flex items-center gap-1 text-sm text-ink-muted">
              <Star size={15} className="fill-amber-400 text-amber-400" />
              {product.rating.toFixed(1)} · {product.reviewsCount} {tt('отзывов', 'sharh')}
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
                  ? `${tt('Предложение', 'Taklif')}: ${selectedOffer.seller.company}`
                  : tt('Лучшее предложение', 'Eng yaxshi taklif')}
                {offers.length > 1 && ` · ${tt('всего', 'jami')} ${offers.length} ${tt('поставщиков', 'yetkazib beruvchi')}`}
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="font-heading text-4xl font-extrabold text-gradient">{formatMoney(unitPrice)}</div>
              {hasContract && (
                <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">{tt('по договору', 'shartnoma boʻyicha')}</span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-subtle">
              <span>{t('product.minOrder')}: {effMinOrder}</span>
              <span>·</span>
              <span>{effInStock ? tt('В наличии', 'Mavjud') : tt('Под заказ', 'Buyurtma asosida')}</span>
              {selectedOffer?.leadTimeDays != null && (<><span>·</span><span className="inline-flex items-center gap-1"><Truck size={13} /> {selectedOffer.leadTimeDays} {tt('дн.', 'kun')}</span></>)}
              {selectedOffer?.isRx && (<><span>·</span><span className="inline-flex items-center gap-1 text-amber-600"><Pill size={13} /> {tt('по рецепту', 'retsept boʻyicha')}</span></>)}
            </div>
            {selectedOffer?.priceBreaks && selectedOffer.priceBreaks.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                {selectedOffer.priceBreaks.map((b, i) => (
                  <span key={i} className={`rounded-md border px-2 py-0.5 ${qty >= b.minQty ? 'border-teal-300 bg-teal-50 text-teal-700' : 'border-slate-200 text-ink-subtle'}`}>
                    {tt('от', 'dan')} {b.minQty} {tt('шт', 'dona')} — {formatMoney(b.price)}
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

            {/* Автопополнение */}
            <div className="mt-3 flex items-center gap-2 border-t border-teal-100 pt-3 text-sm">
              <Repeat size={15} className="text-teal-700" />
              <span className="text-ink-muted">{tt('Автопополнение каждые', 'Avto toʻldirish har')}</span>
              <select className="rounded-md border border-slate-200 px-2 py-1 text-sm outline-none" value={subInterval} onChange={(e) => setSubInterval(Number(e.target.value))}>
                {[7, 14, 30, 60, 90].map((d) => <option key={d} value={d}>{d} {tt('дн', 'kun')}</option>)}
              </select>
              <button className="btn-ghost !px-2 !py-1 text-sm text-teal-700" onClick={subscribe}>{tt('Подписаться', 'Obuna boʻlish')}</button>
            </div>
          </div>
        </div>
      </div>

      {/* Сравнение предложений поставщиков */}
      {offers.length > 0 && (
        <section className="mt-12">
          <div className="mb-3 flex items-center gap-2">
            <Layers size={20} className="text-teal-700" />
            <h2 className="font-heading text-2xl font-bold">{tt('Предложения поставщиков', 'Yetkazib beruvchilar takliflari')}</h2>
            <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">{offers.length}</span>
          </div>
          {/* Баннер доверия / анти-фальсификат */}
          <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-teal-100 bg-teal-50/50 px-4 py-2.5 text-xs text-ink-muted">
            <span className="flex items-center gap-1.5 font-medium text-teal-700"><ShieldCheck size={14} /> {tt('Гарантия подлинности', 'Haqiqiylik kafolati')}</span>
            <span className="flex items-center gap-1"><ClipboardCheck size={13} /> {tt('рег. номер госреестра', 'davlat reestri reg. raqami')}</span>
            <span className="flex items-center gap-1"><CalendarClock size={13} /> {tt('контроль срока годности', 'yaroqlilik muddati nazorati')}</span>
            <span className="flex items-center gap-1"><BadgeCheck size={13} /> {tt('проверенные сертификаты партии', 'partiyaning tekshirilgan sertifikatlari')}</span>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-ink-subtle">
                <tr>
                  <th className="px-4 py-3 font-medium">{tt('Поставщик', 'Yetkazib beruvchi')}</th>
                  <th className="px-4 py-3 font-medium">{tt('Цена / ед.', 'Narx / dona')}</th>
                  <th className="px-4 py-3 font-medium">{tt('Наличие', 'Mavjudlik')}</th>
                  <th className="px-4 py-3 font-medium">{tt('Срок', 'Muddat')}</th>
                  <th className="px-4 py-3 font-medium">{tt('Мин. заказ', 'Min. buyurtma')}</th>
                  <th className="px-4 py-3 font-medium">{tt('Гарантии', 'Kafolatlar')}</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {offers.map((o, idx) => {
                  const isSel = o.id === selectedOffer?.id;
                  const isCheapest = idx === 0;
                  const exp = expiryInfo(o.expiryDate);
                  const isOpen = expandedOfferId === o.id;
                  return (
                    <Fragment key={o.id}>
                    <tr
                      onClick={() => selectOffer(o)}
                      className={`cursor-pointer border-t border-slate-100 transition-colors ${isSel ? 'bg-teal-50/60' : 'hover:bg-slate-50'}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <input type="radio" checked={isSel} onChange={() => selectOffer(o)} className="accent-teal-600" />
                          <Link href={`/suppliers/${o.sellerId}`} onClick={(e) => e.stopPropagation()} className="font-medium hover:text-teal-700">
                            {o.seller?.company ?? tt('Поставщик', 'Yetkazib beruvchi')}
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
                        {contractMap[o.id] != null ? (
                          <>
                            <span className="font-heading font-bold text-emerald-700">{formatMoney(contractMap[o.id])}</span>
                            <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">{tt('по договору', 'shartnoma boʻyicha')}</span>
                            <div className="text-xs text-ink-subtle line-through">{formatMoney(o.price)}</div>
                          </>
                        ) : (
                          <>
                            <span className="font-heading font-bold">{formatMoney(o.price)}</span>
                            {isCheapest && offers.length > 1 && (
                              <span className="ml-2 rounded bg-teal-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">{tt('мин. цена', 'min. narx')}</span>
                            )}
                            {o.netTermDays ? (
                              <div className="text-xs text-ink-subtle">{tt('отсрочка', 'toʻlov muddati')} {o.netTermDays} {tt('дн.', 'kun')}</div>
                            ) : null}
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {o.inStock ? (
                          <span className="text-teal-700">{o.stockQty != null ? `${o.stockQty} ${tt('шт', 'dona')}` : tt('В наличии', 'Mavjud')}</span>
                        ) : (
                          <span className="text-ink-subtle">{tt('Под заказ', 'Buyurtma asosida')}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-ink-muted">{o.leadTimeDays != null ? `${o.leadTimeDays} ${tt('дн.', 'kun')}` : '—'}</td>
                      <td className="px-4 py-3 text-ink-muted">{o.minOrder} {tt('шт', 'dona')}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {o.certVerified && (
                            <span className="inline-flex items-center gap-1 rounded bg-teal-50 px-1.5 py-0.5 text-[11px] text-teal-700"><BadgeCheck size={12} /> {tt('сертиф.', 'sertif.')}</span>
                          )}
                          {o.isRx && (
                            <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-700"><Pill size={12} /> Rx</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
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
                                  price: effPrice(o, o.minOrder) ?? o.price,
                                  minOrder: o.minOrder,
                                  image: images[0],
                                },
                                o.minOrder,
                              );
                              toast.success(`${tt('Добавлено', 'Qoʻshildi')}: ${o.seller?.company ?? tt('поставщик', 'yetkazib beruvchi')}`);
                            }}
                          >
                            <ShoppingCart size={14} /> {tt('В корзину', 'Savatga')}
                          </button>
                          {currentUser?.role === 'ADMIN' && (
                            <button
                              aria-label={tt('Верификация', 'Tasdiqlash')}
                              title={o.certVerified ? tt('Снять верификацию', 'Tasdiqlashni bekor qilish') : tt('Верифицировать подлинность', 'Haqiqiyligini tasdiqlash')}
                              className={`grid h-8 w-8 place-items-center rounded-lg ${o.certVerified ? 'text-teal-700 hover:bg-teal-50' : 'text-ink-subtle hover:bg-slate-100'}`}
                              onClick={(e) => { e.stopPropagation(); verifyOffer(o.id, !o.certVerified); }}
                            >
                              <BadgeCheck size={16} />
                            </button>
                          )}
                          <button
                            aria-label={tt('Детали партии', 'Partiya tafsilotlari')}
                            className="grid h-8 w-8 place-items-center rounded-lg text-ink-subtle hover:bg-slate-100"
                            onClick={(e) => { e.stopPropagation(); setExpandedOfferId(isOpen ? null : o.id); }}
                          >
                            <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="border-t border-slate-100 bg-slate-50/60">
                        <td colSpan={7} className="px-4 py-3">
                          <div className="grid gap-3 text-xs sm:grid-cols-4">
                            <Detail icon={<ClipboardCheck size={14} />} label={tt('Госреестр №', 'Davlat reestri №')} value={o.regNumber ?? '—'} />
                            <Detail icon={<Layers size={14} />} label={tt('Партия', 'Partiya')} value={o.batchNumber ?? '—'} />
                            <Detail
                              icon={exp?.expired ? <ShieldAlert size={14} /> : <CalendarClock size={14} />}
                              label={tt('Годен до', 'Yaroqlilik muddati')}
                              value={exp?.label ?? '—'}
                              tone={exp?.expired ? 'danger' : exp?.warn ? 'warn' : 'ok'}
                              note={exp?.expired ? tt('просрочено', 'muddati oʻtgan') : exp?.warn ? tt('скоро истекает', 'tez orada tugaydi') : undefined}
                            />
                            <div>
                              <div className="mb-1 flex items-center gap-1 text-ink-subtle"><FileText size={14} /> {tt('Сертификаты', 'Sertifikatlar')}</div>
                              {o.certificates?.length ? (
                                o.certificates.map((c, ci) => (
                                  <a key={ci} href={c} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="block text-teal-700 hover:underline">{tt('Сертификат', 'Sertifikat')} {ci + 1}</a>
                                ))
                              ) : (
                                <span className="text-ink-subtle">—</span>
                              )}
                              {o.certVerified && <div className="mt-1 inline-flex items-center gap-1 text-teal-700"><BadgeCheck size={12} /> {tt('проверено платформой', 'platforma tomonidan tekshirilgan')}</div>}
                            </div>
                          </div>
                          {o.isRx && (
                            <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-[11px] text-amber-700">
                              <Pill size={12} /> {tt('Рецептурный препарат — отпуск по ветеринарному рецепту', 'Retsept boʻyicha preparat — veterinariya retsepti boʻyicha beriladi')}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-ink-subtle">{tt('Цены указаны за единицу. Итог рассчитывается с учётом объёмных скидок выбранного поставщика.', 'Narxlar bir dona uchun koʻrsatilgan. Jami tanlangan yetkazib beruvchining hajmli chegirmalari hisobga olingan holda hisoblanadi.')}</p>
        </section>
      )}

      {/* Reviews */}
      {reviews.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 font-heading text-2xl font-bold">{tt('Отзывы', 'Sharhlar')}</h2>
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

// Срок годности: метка + флаги «скоро истекает» / «просрочено».
function expiryInfo(iso?: string | null): { label: string; warn: boolean; expired: boolean } | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const months = (d.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30);
  return { label: d.toLocaleDateString('ru-RU'), warn: months < 6, expired: months < 0 };
}

function Detail({
  icon,
  label,
  value,
  tone,
  note,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: 'ok' | 'warn' | 'danger';
  note?: string;
}) {
  const toneCls = tone === 'danger' ? 'text-red-600' : tone === 'warn' ? 'text-amber-600' : 'text-ink';
  return (
    <div>
      <div className="mb-1 flex items-center gap-1 text-ink-subtle">{icon} {label}</div>
      <div className={`font-medium ${toneCls}`}>{value}{note ? <span className="ml-1 text-[10px]">({note})</span> : null}</div>
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
