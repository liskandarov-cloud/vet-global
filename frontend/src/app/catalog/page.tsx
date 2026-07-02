'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, SlidersHorizontal } from 'lucide-react';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { Category, Product } from '@/lib/types';
import { ProductCard } from '@/components/ProductCard';

const ANIMALS = [
  { value: 'POULTRY', label: 'Птица' },
  { value: 'CATTLE', label: 'КРС' },
  { value: 'SMALL_RUMINANTS', label: 'МРС' },
  { value: 'HORSES', label: 'Лошади' },
  { value: 'PETS', label: 'Кошки/собаки' },
  { value: 'OTHER', label: 'Прочее' },
];

function CatalogInner() {
  const { t, lang } = useI18n();
  const params = useSearchParams();

  const [categories, setCategories] = useState<Category[]>([]);
  const [facets, setFacets] = useState<{ manufacturers: string[]; forms: string[] }>({ manufacturers: [], forms: [] });
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(params.get('category') ?? '');
  const [manufacturer, setManufacturer] = useState('');
  const [animalType, setAnimalType] = useState('');
  const [inStock, setInStock] = useState(false);
  const [sort, setSort] = useState('newest');

  useEffect(() => {
    api.get('/categories').then((r) => setCategories(r.data)).catch(() => {});
    api.get('/products/facets').then((r) => setFacets(r.data)).catch(() => {});
  }, []);

  const query = useMemo(
    () => ({
      search: search || undefined,
      category: category || undefined,
      manufacturer: manufacturer || undefined,
      animalType: animalType || undefined,
      inStock: inStock ? true : undefined,
      sort,
      limit: 24,
    }),
    [search, category, manufacturer, animalType, inStock, sort],
  );

  useEffect(() => {
    setLoading(true);
    const id = setTimeout(() => {
      api
        .get('/products', { params: query })
        .then((r) => {
          setProducts(r.data.products);
          setTotal(r.data.total);
        })
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(id);
  }, [query]);

  const reset = () => {
    setSearch(''); setCategory(''); setManufacturer(''); setAnimalType(''); setInStock(false); setSort('newest');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="mb-6 font-heading text-3xl font-extrabold">{t('catalog.title')}</h1>

      <div className="relative mb-6">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
        <input
          className="input pl-10"
          placeholder={t('catalog.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Filters */}
        <aside className="card h-max space-y-5 p-5">
          <div className="flex items-center gap-2 font-semibold">
            <SlidersHorizontal size={16} /> {t('catalog.filters')}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">{t('catalog.category')}</label>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">{t('catalog.all')}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>{lang === 'uz' ? c.nameUz : c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">{t('catalog.manufacturer')}</label>
            <select className="input" value={manufacturer} onChange={(e) => setManufacturer(e.target.value)}>
              <option value="">{t('catalog.all')}</option>
              {facets.manufacturers.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">{t('catalog.animal')}</label>
            <select className="input" value={animalType} onChange={(e) => setAnimalType(e.target.value)}>
              <option value="">{t('catalog.all')}</option>
              {ANIMALS.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} className="h-4 w-4 accent-teal-600" />
            {t('catalog.inStock')}
          </label>

          <button onClick={reset} className="btn-secondary w-full">{t('catalog.reset')}</button>
        </aside>

        {/* Results */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-ink-muted">{total} товаров</span>
            <select className="input !h-9 !w-auto" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="newest">Сначала новые</option>
              <option value="price_asc">Дешевле</option>
              <option value="price_desc">Дороже</option>
              <option value="rating">По рейтингу</option>
            </select>
          </div>

          {loading ? (
            <div className="py-20 text-center text-ink-subtle">{t('common.loading')}</div>
          ) : products.length === 0 ? (
            <div className="py-20 text-center text-ink-subtle">{t('catalog.empty')}</div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CatalogPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-ink-subtle">Загрузка…</div>}>
      <CatalogInner />
    </Suspense>
  );
}
