'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, Beaker, Truck, Activity } from 'lucide-react';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { Category, Product } from '@/lib/types';
import { ProductCard } from '@/components/ProductCard';

const HERO = 'https://images.unsplash.com/photo-1559056749-afb9dc6647ba?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200';

export default function HomePage() {
  const { t, lang } = useI18n();
  const [categories, setCategories] = useState<Category[]>([]);
  const [promos, setPromos] = useState<Product[]>([]);

  useEffect(() => {
    api.get('/categories').then((r) => setCategories(r.data)).catch(() => {});
    api
      .get('/products', { params: { isPromotion: true, limit: 4 } })
      .then((r) => setPromos(r.data.products))
      .catch(() => {});
  }, []);

  return (
    <div>
      {/* Hero — asymmetric, per design guide */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 to-teal-50/40">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-teal-100 px-3 py-1 text-sm font-medium text-teal-800">
              <ShieldCheck size={15} /> {t('home.verified')}
            </span>
            <h1 className="mt-4 font-heading text-4xl font-extrabold leading-tight md:text-5xl">
              {t('home.hero.title')}
            </h1>
            <p className="mt-4 max-w-lg text-lg text-ink-muted">{t('home.hero.subtitle')}</p>
            <div className="mt-8 flex gap-3">
              <Link href="/catalog" className="btn-primary">
                {t('home.hero.cta')} <ArrowRight size={18} />
              </Link>
              <Link href="/suppliers" className="btn-secondary">{t('home.verified')}</Link>
            </div>
            <div className="mt-10 flex gap-8">
              {[
                { icon: Beaker, label: 'Препаратов', value: '5 000+' },
                { icon: Truck, label: 'Поставщиков', value: '120+' },
                { icon: Activity, label: 'Заказов', value: '10 000+' },
              ].map((s) => (
                <div key={s.label}>
                  <div className="font-heading text-2xl font-bold text-teal-700">{s.value}</div>
                  <div className="text-sm text-ink-subtle">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative -mt-6 md:mt-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={HERO} alt="VetGlobal" className="rounded-2xl shadow-glow" />
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-14">
        <h2 className="mb-6 font-heading text-2xl font-bold">{t('home.categories')}</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/catalog?category=${c.slug}`}
              className="card flex flex-col items-center gap-2 p-5 text-center transition-colors hover:border-teal-200"
            >
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-teal-50 text-teal-700">
                <Beaker size={20} />
              </span>
              <span className="text-sm font-medium">{lang === 'uz' ? c.nameUz : c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Promotions */}
      {promos.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-16">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-heading text-2xl font-bold">{t('home.promotions')}</h2>
            <Link href="/promotions" className="btn-ghost">
              {t('common.all')} <ArrowRight size={16} />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {promos.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
