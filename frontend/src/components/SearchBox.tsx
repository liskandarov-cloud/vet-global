'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, X } from 'lucide-react';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

interface Hit {
  id: string;
  name: string;
  manufacturer?: string;
  price: number;
  minPrice?: number | null;
  images?: string[];
}

export function SearchBox({ className = '' }: { className?: string }) {
  const { tt } = useI18n();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Дебаунс-запрос подсказок.
  useEffect(() => {
    if (q.trim().length < 2) { setHits([]); return; }
    setLoading(true);
    const t = setTimeout(() => {
      api.get('/products', { params: { search: q, limit: 6 } })
        .then((r) => { setHits(r.data.products ?? []); setOpen(true); })
        .catch(() => setHits([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  // Закрытие по клику вне.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const submit = () => {
    if (!q.trim()) return;
    setOpen(false);
    router.push(`/catalog?search=${encodeURIComponent(q)}`);
  };

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white/70 px-3 focus-within:border-teal-400">
        <Search size={15} className="shrink-0 text-ink-subtle" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => hits.length && setOpen(true)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder={tt('Поиск товаров…', 'Mahsulot qidirish…')}
          className="h-9 w-full bg-transparent text-sm outline-none"
        />
        {q && <button onClick={() => { setQ(''); setHits([]); }} className="text-ink-subtle hover:text-ink"><X size={14} /></button>}
      </div>

      {open && (q.trim().length >= 2) && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          {loading && hits.length === 0 ? (
            <div className="px-4 py-3 text-sm text-ink-subtle">{tt('Поиск…', 'Qidirish…')}</div>
          ) : hits.length === 0 ? (
            <div className="px-4 py-3 text-sm text-ink-subtle">{tt('Ничего не найдено', 'Hech narsa topilmadi')}</div>
          ) : (
            <>
              {hits.map((h) => (
                <Link key={h.id} href={`/products/${h.id}`} onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={h.images?.[0] ?? '/icon.svg'} alt="" className="h-9 w-9 rounded-md object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{h.name}</div>
                    <div className="truncate text-xs text-ink-subtle">{h.manufacturer ?? ''}</div>
                  </div>
                  <div className="shrink-0 text-sm font-semibold text-teal-700">{formatMoney(h.minPrice ?? h.price)}</div>
                </Link>
              ))}
              <button onClick={submit} className="block w-full border-t border-slate-100 px-3 py-2 text-left text-sm font-medium text-teal-700 hover:bg-slate-50">
                {tt('Все результаты по', 'Barcha natijalar')} «{q}» →
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
