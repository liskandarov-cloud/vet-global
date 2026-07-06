'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Trophy, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/store';
import { formatMoney } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

const STATUS: Record<string, { label: string; cls: string }> = {
  OPEN: { label: 'Открыт', cls: 'bg-teal-50 text-teal-700' },
  AWARDED: { label: 'Поставщик выбран', cls: 'bg-emerald-50 text-emerald-700' },
  CLOSED: { label: 'Закрыт', cls: 'bg-slate-100 text-ink-subtle' },
};

const STATUS_UZ: Record<string, string> = {
  OPEN: 'Ochiq',
  AWARDED: 'Yetkazib beruvchi tanlandi',
  CLOSED: 'Yopiq',
};

export default function RfqDetailPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);
  const { user } = useAuth();
  const { tt } = useI18n();
  const [rfq, setRfq] = useState<any>(null);
  const [price, setPrice] = useState(0);
  const [lead, setLead] = useState(3);
  const [qnote, setQnote] = useState('');

  const load = () => api.get(`/rfq/${id}`).then((r) => setRfq(r.data)).catch(() => {});
  useEffect(() => { if (id) load(); }, [id]);

  if (!rfq) return <div className="py-24 text-center text-ink-subtle">{tt('Загрузка…', 'Yuklanmoqda…')}</div>;

  const isBuyer = rfq.buyer?.id === user?.id;
  const submitQuote = async () => {
    if (price <= 0) { toast.error(tt('Укажите цену', 'Narxni koʻrsating')); return; }
    try {
      await api.post(`/rfq/${id}/quote`, { totalPrice: price, leadTimeDays: lead, note: qnote });
      toast.success(tt('Котировка отправлена', 'Kotirovka yuborildi'));
      load();
    } catch (e: any) { toast.error(e?.response?.data?.message ?? tt('Ошибка', 'Xatolik')); }
  };
  const award = async (quoteId: string) => {
    try { await api.post(`/rfq/${id}/award/${quoteId}`); toast.success(tt('Поставщик выбран', 'Yetkazib beruvchi tanlandi')); load(); }
    catch (e: any) { toast.error(e?.response?.data?.message ?? tt('Ошибка', 'Xatolik')); }
  };
  const close = async () => {
    try { await api.post(`/rfq/${id}/close`); toast.success(tt('Запрос закрыт', 'Soʻrov yopildi')); load(); }
    catch (e: any) { toast.error(e?.response?.data?.message ?? tt('Ошибка', 'Xatolik')); }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/rfq" className="btn-ghost mb-4"><ArrowLeft size={16} /> {tt('Запросы', 'Soʻrovlar')}</Link>
      <div className="flex items-start justify-between gap-3">
        <h1 className="font-heading text-2xl font-extrabold">{rfq.title}</h1>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS[rfq.status]?.cls}`}>{tt(STATUS[rfq.status]?.label, STATUS_UZ[rfq.status])}</span>
      </div>
      {rfq.note && <p className="mt-2 text-ink-muted">{rfq.note}</p>}

      {/* Позиции */}
      <div className="card mt-4 p-4">
        <div className="mb-2 text-sm font-medium">{tt('Позиции запроса', 'Soʻrov pozitsiyalari')}</div>
        <ul className="divide-y divide-slate-100 text-sm">
          {rfq.items.map((it: any) => (
            <li key={it.id} className="flex justify-between py-2"><span>{it.name}</span><span className="text-ink-subtle">{it.quantity} {tt('шт', 'dona')}</span></li>
          ))}
        </ul>
      </div>

      {/* Продавец: форма котировки */}
      {rfq.canQuote && !isBuyer && (
        <div className="card mt-4 space-y-3 p-4">
          <div className="font-medium">{tt('Ваша котировка', 'Sizning kotirovkangiz')}</div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-ink-muted">{tt('Итоговая цена, сум', 'Yakuniy narx, soʻm')}</label>
              <input className="input" type="number" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value))} />
            </div>
            <div className="w-28">
              <label className="mb-1 block text-xs text-ink-muted">{tt('Срок, дней', 'Muddat, kun')}</label>
              <input className="input" type="number" min={0} value={lead} onChange={(e) => setLead(Number(e.target.value))} />
            </div>
          </div>
          <textarea className="input" rows={2} placeholder={tt('Комментарий (необязательно)', 'Izoh (ixtiyoriy)')} value={qnote} onChange={(e) => setQnote(e.target.value)} />
          <button className="btn-primary w-full" onClick={submitQuote}>{tt('Отправить котировку', 'Kotirovkani yuborish')}</button>
        </div>
      )}

      {/* Котировки */}
      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold">{tt('Котировки', 'Kotirovkalar')} · {rfq.quotes.length}</h2>
          {isBuyer && rfq.status === 'OPEN' && <button className="btn-ghost text-sm" onClick={close}>{tt('Закрыть запрос', 'Soʻrovni yopish')}</button>}
        </div>
        {rfq.quotes.length === 0 ? (
          <div className="py-8 text-center text-ink-subtle">{tt('Котировок пока нет', 'Hozircha kotirovkalar yoʻq')}</div>
        ) : (
          <div className="space-y-2">
            {rfq.quotes.map((q: any, idx: number) => (
              <div key={q.id} className={`card flex items-center justify-between p-4 ${q.isAwarded ? 'ring-1 ring-emerald-300' : ''}`}>
                <div>
                  <div className="flex items-center gap-2 font-medium">
                    {q.seller?.company ?? tt('Поставщик', 'Yetkazib beruvchi')}
                    {q.seller?.isVerified && <ShieldCheck size={14} className="text-teal-700" />}
                    {idx === 0 && rfq.quotes.length > 1 && <span className="rounded bg-teal-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">{tt('лучшая цена', 'eng yaxshi narx')}</span>}
                    {q.isAwarded && <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700"><Trophy size={11} /> {tt('выбран', 'tanlangan')}</span>}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-ink-subtle">
                    {q.leadTimeDays != null && <span className="inline-flex items-center gap-1"><Truck size={12} /> {q.leadTimeDays} {tt('дн.', 'kun')}</span>}
                    {q.note && <span>· {q.note}</span>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-heading text-lg font-bold">{formatMoney(q.totalPrice)}</div>
                  {isBuyer && rfq.status === 'OPEN' && (
                    <button className="btn-primary mt-1 !px-3 !py-1 text-xs" onClick={() => award(q.id)}>{tt('Выбрать', 'Tanlash')}</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
