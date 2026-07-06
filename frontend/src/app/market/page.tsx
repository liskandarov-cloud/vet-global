'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/store';
import { TopProductsBar } from '@/components/Charts';
import { formatMoney } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

interface Insights {
  categories: { category: string; offers: number; priceMin: number; priceAvg: number; priceMax: number; demandUnits: number; demandRevenue: number }[];
  topProducts: { name: string; units: number; revenue: number }[];
  totals: { revenue: number; units: number };
}
interface Position {
  myRevenue: number;
  categoryShare: { category: string; myRevenue: number; marketRevenue: number; sharePct: number }[];
  pricePositioning: { product: string; myPrice: number; marketMin: number; marketAvg: number; deltaPct: number; isCheapest: boolean }[];
}

export default function MarketPage() {
  const { user, ready } = useAuth();
  const { tt } = useI18n();
  const [ins, setIns] = useState<Insights | null>(null);
  const [pos, setPos] = useState<Position | null>(null);

  const allowed = user?.role === 'SELLER' || user?.role === 'ADMIN';

  useEffect(() => {
    if (!allowed) return;
    api.get('/market/insights').then((r) => setIns(r.data)).catch(() => {});
    api.get('/market/my-position').then((r) => setPos(r.data)).catch(() => {});
  }, [allowed]);

  if (ready && !user) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <BarChart3 size={40} className="mx-auto text-ink-subtle" />
        <p className="mt-4 text-ink-muted">{tt('Аналитика рынка доступна поставщикам платформы.', 'Bozor tahlili platforma yetkazib beruvchilariga ochiq.')}</p>
        <Link href="/login" className="btn-primary mt-6 inline-flex">{tt('Войти', 'Kirish')}</Link>
      </div>
    );
  }
  if (ready && !allowed) {
    return <div className="mx-auto max-w-md px-4 py-24 text-center text-ink-muted">{tt('Раздел доступен только поставщикам и администраторам.', 'Boʻlim faqat yetkazib beruvchilar va administratorlarga ochiq.')}</div>;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6">
        <span className="eyebrow">Insights</span>
        <h1 className="mt-3 section-title">{tt('Аналитика рынка', 'Bozor tahlili')}</h1>
        <p className="mt-2 text-ink-muted">{tt('Спрос, цены и ваша позиция на рынке ветеринарных товаров.', 'Talab, narxlar va veterinariya mahsulotlari bozoridagi oʻrningiz.')}</p>
      </div>

      {/* Totals */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5"><div className="text-xs text-ink-subtle">{tt('GMV платформы', 'Platforma GMV')}</div><div className="mt-1 font-heading text-2xl font-bold">{formatMoney(ins?.totals.revenue ?? 0)}</div></div>
        <div className="card p-5"><div className="text-xs text-ink-subtle">{tt('Продано единиц', 'Sotilgan birliklar')}</div><div className="mt-1 font-heading text-2xl font-bold">{(ins?.totals.units ?? 0).toLocaleString('ru-RU')}</div></div>
        <div className="card p-5"><div className="text-xs text-ink-subtle">{tt('Ваша выручка', 'Sizning daromadingiz')}</div><div className="mt-1 font-heading text-2xl font-bold text-teal-700">{formatMoney(pos?.myRevenue ?? 0)}</div></div>
      </div>

      {/* Спрос по категориям */}
      <section className="mt-8">
        <h2 className="mb-3 font-heading text-lg font-bold">{tt('Спрос по категориям', 'Kategoriyalar boʻyicha talab')}</h2>
        <div className="card p-4" style={{ height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={ins?.categories ?? []} margin={{ left: 0, right: 8, top: 8, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="category" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip formatter={(v: any) => formatMoney(Number(v))} />
              <Bar dataKey="demandRevenue" radius={[6, 6, 0, 0]} fill="#0d9488" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Бенчмарк цен */}
      <section className="mt-8">
        <h2 className="mb-3 font-heading text-lg font-bold">{tt('Бенчмарк цен по категориям', 'Kategoriyalar boʻyicha narxlar benchmarki')}</h2>
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-ink-subtle">
              <tr><th className="px-4 py-3">{tt('Категория', 'Kategoriya')}</th><th className="px-4 py-3">{tt('Предложений', 'Takliflar')}</th><th className="px-4 py-3">{tt('Мин.', 'Min.')}</th><th className="px-4 py-3">{tt('Средняя', 'Oʻrtacha')}</th><th className="px-4 py-3">{tt('Макс.', 'Maks.')}</th></tr>
            </thead>
            <tbody>
              {(ins?.categories ?? []).map((c) => (
                <tr key={c.category} className="border-t border-slate-100">
                  <td className="px-4 py-2.5 font-medium">{c.category}</td>
                  <td className="px-4 py-2.5 text-ink-subtle">{c.offers}</td>
                  <td className="px-4 py-2.5 text-teal-700">{formatMoney(c.priceMin)}</td>
                  <td className="px-4 py-2.5">{formatMoney(c.priceAvg)}</td>
                  <td className="px-4 py-2.5 text-ink-subtle">{formatMoney(c.priceMax)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Топ товары */}
      {ins?.topProducts && ins.topProducts.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-heading text-lg font-bold">{tt('Топ-товары по выручке', 'Daromad boʻyicha top mahsulotlar')}</h2>
          <div className="card p-4"><TopProductsBar data={ins.topProducts} /></div>
        </section>
      )}

      {/* Позиция продавца */}
      {pos && pos.pricePositioning.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-heading text-lg font-bold">{tt('Ваше ценовое позиционирование', 'Sizning narx pozitsiyangiz')}</h2>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-ink-subtle">
                <tr><th className="px-4 py-3">{tt('Товар', 'Mahsulot')}</th><th className="px-4 py-3">{tt('Ваша цена', 'Sizning narxingiz')}</th><th className="px-4 py-3">{tt('Рынок мин.', 'Bozor min.')}</th><th className="px-4 py-3">{tt('Рынок средн.', 'Bozor oʻrt.')}</th><th className="px-4 py-3">{tt('Δ к рынку', 'Δ bozorga')}</th></tr>
              </thead>
              <tbody>
                {pos.pricePositioning.map((p) => (
                  <tr key={p.product} className="border-t border-slate-100">
                    <td className="px-4 py-2.5 font-medium">{p.product}{p.isCheapest && <span className="ml-2 rounded bg-teal-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">{tt('лучшая', 'eng yaxshi')}</span>}</td>
                    <td className="px-4 py-2.5 font-semibold">{formatMoney(p.myPrice)}</td>
                    <td className="px-4 py-2.5 text-ink-subtle">{formatMoney(p.marketMin)}</td>
                    <td className="px-4 py-2.5 text-ink-subtle">{formatMoney(p.marketAvg)}</td>
                    <td className={`px-4 py-2.5 font-medium ${p.deltaPct > 0 ? 'text-red-500' : 'text-teal-700'}`}>
                      <span className="inline-flex items-center gap-1">{p.deltaPct > 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}{p.deltaPct > 0 ? '+' : ''}{p.deltaPct}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {pos && pos.categoryShare.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-heading text-lg font-bold">{tt('Ваша доля в категориях', 'Kategoriyalardagi ulushingiz')}</h2>
          <div className="space-y-2">
            {pos.categoryShare.map((c) => (
              <div key={c.category} className="card p-4">
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium">{c.category}</span>
                  <span className="text-ink-subtle">{formatMoney(c.myRevenue)} {tt('из', 'dan')} {formatMoney(c.marketRevenue)} · <b className="text-teal-700">{c.sharePct}%</b></span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-teal-600 to-emerald-500" style={{ width: `${Math.min(100, c.sharePct)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
