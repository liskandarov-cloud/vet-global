'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight, ShieldCheck, Beaker, Truck, Activity, Syringe, Pill, Sprout,
  SprayCan, Wheat, Microscope, Package, Star, FileText, Stethoscope,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { Category, Product } from '@/lib/types';
import { ProductCard } from '@/components/ProductCard';
import { formatMoney } from '@/lib/utils';

const HERO = 'https://images.unsplash.com/photo-1559056749-afb9dc6647ba?crop=entropy&cs=srgb&fm=jpg&q=85&w=1000';

const CAT_ICON: Record<string, any> = {
  vaccines: Syringe, antibiotics: Pill, vitamins: Sprout, disinfectants: SprayCan,
  'feed-additives': Wheat, diagnostics: Microscope, other: Package,
};

interface Seller { id: string; company?: string; rating: number; productsCount: number; isVerified: boolean }
interface Post { id: string; title: string; slug: string; excerpt?: string; createdAt: string }

export default function HomePage() {
  const { t, lang } = useI18n();
  const [categories, setCategories] = useState<Category[]>([]);
  const [promos, setPromos] = useState<Product[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    api.get('/categories').then((r) => setCategories(r.data)).catch(() => {});
    api.get('/products', { params: { isPromotion: true, limit: 4 } }).then((r) => setPromos(r.data.products)).catch(() => {});
    api.get('/sellers', { params: { verifiedOnly: true } }).then((r) => setSellers(r.data.slice(0, 3))).catch(() => {});
    api.get('/blog', { params: { limit: 3 } }).then((r) => setPosts(r.data.posts)).catch(() => {});
  }, []);

  return (
    <div>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-grid">
        <div className="absolute inset-0 bg-glow" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-20 md:grid-cols-[1.1fr_0.9fr] md:py-28">
          <div>
            <span className="eyebrow animate-up"><ShieldCheck size={14} /> {t('home.verified')}</span>
            <h1 className="mt-5 animate-up font-heading text-4xl font-extrabold leading-[1.05] md:text-6xl" style={{ animationDelay: '0.05s' }}>
              <span className="text-gradient">B2B-платформа</span><br />ветеринарных решений
            </h1>
            <p className="mt-5 max-w-xl animate-up text-lg text-ink-muted" style={{ animationDelay: '0.1s' }}>
              {t('home.hero.subtitle')}
            </p>
            <div className="mt-8 flex flex-wrap gap-3 animate-up" style={{ animationDelay: '0.15s' }}>
              <Link href="/catalog" className="btn-primary">{t('home.hero.cta')} <ArrowRight size={18} /></Link>
              <Link href="/consult" className="btn-secondary"><Stethoscope size={16} /> Ветконсультация</Link>
            </div>
            <div className="mt-12 grid max-w-lg grid-cols-3 gap-6 animate-up" style={{ animationDelay: '0.2s' }}>
              {[
                { icon: Beaker, value: '5 000+', label: 'Препаратов' },
                { icon: Truck, value: '120+', label: 'Поставщиков' },
                { icon: Activity, value: '10 000+', label: 'Заказов' },
              ].map((s) => (
                <div key={s.label}>
                  <div className="font-heading text-3xl font-extrabold text-ink">{s.value}</div>
                  <div className="text-sm text-ink-subtle">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative animate-up" style={{ animationDelay: '0.15s' }}>
            <div className="animate-float overflow-hidden rounded-3xl border border-white/50 shadow-glow">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={HERO} alt="VetGlobal" className="h-full w-full object-cover" />
            </div>
            {/* floating chips */}
            <div className="glass absolute -left-4 top-8 flex items-center gap-2 rounded-xl px-3 py-2 shadow-soft">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-teal-600 text-white"><ShieldCheck size={16} /></span>
              <div className="text-xs"><div className="font-semibold">Проверенный</div><div className="text-ink-subtle">поставщик</div></div>
            </div>
            <div className="glass absolute -bottom-4 right-6 flex items-center gap-2 rounded-xl px-3 py-2 shadow-soft">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-secondary text-white"><FileText size={16} /></span>
              <div className="text-xs"><div className="font-semibold">Сертификат</div><div className="text-ink-subtle">качества PDF</div></div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust strip ── */}
      <section className="border-y border-slate-100 bg-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: ShieldCheck, t: 'Проверенные поставщики', d: 'Верификация юрлиц и лицензий' },
            { icon: FileText, t: 'Сертификаты качества', d: 'PDF к каждому препарату' },
            { icon: Truck, t: 'Доставка и логистика', d: 'Курьер, самовывоз, ТК' },
            { icon: Activity, t: 'Прозрачные цены', d: 'Без переплат 15–40%' },
          ].map((f) => (
            <div key={f.t} className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700"><f.icon size={20} /></span>
              <div>
                <div className="font-semibold">{f.t}</div>
                <div className="text-sm text-ink-subtle">{f.d}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Categories ── */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <span className="eyebrow">Каталог</span>
            <h2 className="section-title mt-3">{t('home.categories')}</h2>
          </div>
          <Link href="/catalog" className="btn-ghost hidden sm:inline-flex">{t('common.all')} <ArrowRight size={16} /></Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
          {categories.map((c, i) => {
            const Icon = CAT_ICON[c.slug] ?? Package;
            return (
              <Link key={c.id} href={`/catalog?category=${c.slug}`}
                className="card card-hover animate-up flex flex-col items-center gap-3 p-5 text-center"
                style={{ animationDelay: `${i * 0.05}s` }}>
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-teal-50 to-emerald-50 text-teal-700"><Icon size={22} /></span>
                <span className="text-sm font-medium">{lang === 'uz' ? c.nameUz : c.name}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Promotions ── */}
      {promos.length > 0 && (
        <section className="bg-gradient-to-br from-slate-50 to-teal-50/40 py-16">
          <div className="mx-auto max-w-7xl px-4">
            <div className="mb-8 flex items-end justify-between">
              <div>
                <span className="eyebrow" style={{ color: '#c2410c', background: '#ffedd5', borderColor: '#fed7aa' }}>Выгодно</span>
                <h2 className="section-title mt-3">{t('home.promotions')}</h2>
              </div>
              <Link href="/promotions" className="btn-ghost hidden sm:inline-flex">{t('common.all')} <ArrowRight size={16} /></Link>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {promos.map((p, i) => (
                <div key={p.id} className="animate-up" style={{ animationDelay: `${i * 0.06}s` }}>
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Verified suppliers ── */}
      {sellers.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16">
          <div className="mb-8">
            <span className="eyebrow"><ShieldCheck size={14} /> Доверие</span>
            <h2 className="section-title mt-3">{t('home.verified')}</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {sellers.map((s) => (
              <Link key={s.id} href={`/suppliers/${s.id}`} className="card card-hover flex items-center gap-4 p-5">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-teal-600 to-emerald-500 font-heading text-xl font-bold text-white">
                  {(s.company ?? 'V').charAt(0)}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1 font-semibold">
                    <span className="truncate">{s.company ?? 'Поставщик'}</span>
                    {s.isVerified && <ShieldCheck size={15} className="shrink-0 text-teal-700" />}
                  </div>
                  <div className="mt-1 flex gap-3 text-sm text-ink-subtle">
                    <span className="flex items-center gap-1"><Star size={13} className="fill-amber-400 text-amber-400" />{s.rating.toFixed(1)}</span>
                    <span>{s.productsCount} товаров</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Blog teaser ── */}
      {posts.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-16">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <span className="eyebrow">Экспертиза</span>
              <h2 className="section-title mt-3">{t('nav.blog')} и новости</h2>
            </div>
            <Link href="/blog" className="btn-ghost hidden sm:inline-flex">{t('common.all')} <ArrowRight size={16} /></Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {posts.map((p) => (
              <Link key={p.id} href={`/blog/${p.slug}`} className="card card-hover p-6">
                <div className="text-xs text-ink-subtle">{new Date(p.createdAt).toLocaleDateString('ru-RU')}</div>
                <h3 className="mt-2 font-heading text-lg font-bold leading-snug">{p.title}</h3>
                {p.excerpt && <p className="mt-2 line-clamp-3 text-sm text-ink-muted">{p.excerpt}</p>}
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-teal-700">Читать <ArrowRight size={14} /></span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── CTA band ── */}
      <section className="mx-auto max-w-7xl px-4 pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-600 to-emerald-500 px-8 py-14 text-center text-white shadow-glow">
          <div className="absolute inset-0 bg-grid opacity-20" />
          <div className="relative">
            <h2 className="font-heading text-3xl font-extrabold md:text-4xl">Начните закупки на VetGlobal</h2>
            <p className="mx-auto mt-3 max-w-xl text-white/90">Прозрачные цены, проверенные поставщики и юридически значимый цикл сделки — в одном месте.</p>
            <div className="mt-8 flex justify-center gap-3">
              <Link href="/register" className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 font-semibold text-teal-700 transition-transform hover:-translate-y-0.5">Создать аккаунт</Link>
              <Link href="/catalog" className="inline-flex items-center gap-2 rounded-lg border border-white/40 px-6 py-3 font-semibold text-white transition-colors hover:bg-white/10">В каталог</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
