'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Award, Package } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/store';
import { useI18n } from '@/lib/i18n';

interface Brand {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  description?: string | null;
  isSponsored: boolean;
  productCount: number;
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const { tt } = useI18n();
  const user = useAuth((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';

  const load = () => api.get('/brands').then((r) => setBrands(r.data)).catch(() => {}).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const toggleSponsor = async (e: React.MouseEvent, b: Brand) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await api.patch(`/brands/${b.id}/sponsor`, { isSponsored: !b.isSponsored, sponsorRank: !b.isSponsored ? 10 : 0 });
      toast.success(b.isSponsored ? tt('Продвижение отключено', 'Reklama oʻchirildi') : tt('Бренд продвигается', 'Brend reklama qilinmoqda'));
      load();
    } catch { toast.error(tt('Ошибка', 'Xatolik')); }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <span className="eyebrow">{tt('Производители', 'Ishlab chiqaruvchilar')}</span>
        <h1 className="mt-3 section-title">{tt('Бренды', 'Brendlar')}</h1>
        <p className="mt-2 text-ink-muted">{tt('Официальные производители ветпрепаратов и кормов на платформе.', 'Platformadagi vetpreparatlar va ozuqalarning rasmiy ishlab chiqaruvchilari.')}</p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-ink-subtle">{tt('Загрузка…', 'Yuklanmoqda…')}</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {brands.map((b) => (
            <Link key={b.id} href={`/brands/${b.slug}`} className={`card card-hover relative p-5 ${b.isSponsored ? 'ring-1 ring-amber-300' : ''}`}>
              {b.isSponsored && (
                <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                  <Award size={11} /> {tt('Продвигается', 'Reklama qilinmoqda')}
                </span>
              )}
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-teal-50 font-heading text-lg font-bold text-teal-700">
                {b.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="mt-3 font-heading text-lg font-bold">{b.name}</div>
              {b.description && <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{b.description}</p>}
              <div className="mt-3 flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-xs text-ink-subtle"><Package size={13} /> {b.productCount} {tt('товаров', 'mahsulot')}</span>
                {isAdmin && (
                  <button
                    onClick={(e) => toggleSponsor(e, b)}
                    className={`rounded-md px-2 py-1 text-[11px] font-medium ${b.isSponsored ? 'bg-amber-100 text-amber-700' : 'border border-slate-200 text-ink-muted hover:border-amber-300'}`}
                  >
                    {b.isSponsored ? tt('Продвигается ✓', 'Reklama qilinmoqda ✓') : tt('Продвигать', 'Reklama qilish')}
                  </button>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
