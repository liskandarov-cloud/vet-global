'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Trophy, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/store';
import { formatMoney } from '@/lib/utils';

const STATUS: Record<string, { label: string; cls: string }> = {
  OPEN: { label: 'Открыт', cls: 'bg-teal-50 text-teal-700' },
  AWARDED: { label: 'Поставщик выбран', cls: 'bg-emerald-50 text-emerald-700' },
  CLOSED: { label: 'Закрыт', cls: 'bg-slate-100 text-ink-subtle' },
};

export default function RfqDetailPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);
  const { user } = useAuth();
  const [rfq, setRfq] = useState<any>(null);
  const [price, setPrice] = useState(0);
  const [lead, setLead] = useState(3);
  const [qnote, setQnote] = useState('');

  const load = () => api.get(`/rfq/${id}`).then((r) => setRfq(r.data)).catch(() => {});
  useEffect(() => { if (id) load(); }, [id]);

  if (!rfq) return <div className="py-24 text-center text-ink-subtle">Загрузка…</div>;

  const isBuyer = rfq.buyer?.id === user?.id;
  const submitQuote = async () => {
    if (price <= 0) { toast.error('Укажите цену'); return; }
    try {
      await api.post(`/rfq/${id}/quote`, { totalPrice: price, leadTimeDays: lead, note: qnote });
      toast.success('Котировка отправлена');
      load();
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Ошибка'); }
  };
  const award = async (quoteId: string) => {
    try { await api.post(`/rfq/${id}/award/${quoteId}`); toast.success('Поставщик выбран'); load(); }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Ошибка'); }
  };
  const close = async () => {
    try { await api.post(`/rfq/${id}/close`); toast.success('Запрос закрыт'); load(); }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Ошибка'); }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/rfq" className="btn-ghost mb-4"><ArrowLeft size={16} /> Запросы</Link>
      <div className="flex items-start justify-between gap-3">
        <h1 className="font-heading text-2xl font-extrabold">{rfq.title}</h1>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS[rfq.status]?.cls}`}>{STATUS[rfq.status]?.label}</span>
      </div>
      {rfq.note && <p className="mt-2 text-ink-muted">{rfq.note}</p>}

      {/* Позиции */}
      <div className="card mt-4 p-4">
        <div className="mb-2 text-sm font-medium">Позиции запроса</div>
        <ul className="divide-y divide-slate-100 text-sm">
          {rfq.items.map((it: any) => (
            <li key={it.id} className="flex justify-between py-2"><span>{it.name}</span><span className="text-ink-subtle">{it.quantity} шт</span></li>
          ))}
        </ul>
      </div>

      {/* Продавец: форма котировки */}
      {rfq.canQuote && !isBuyer && (
        <div className="card mt-4 space-y-3 p-4">
          <div className="font-medium">Ваша котировка</div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-ink-muted">Итоговая цена, сум</label>
              <input className="input" type="number" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value))} />
            </div>
            <div className="w-28">
              <label className="mb-1 block text-xs text-ink-muted">Срок, дней</label>
              <input className="input" type="number" min={0} value={lead} onChange={(e) => setLead(Number(e.target.value))} />
            </div>
          </div>
          <textarea className="input" rows={2} placeholder="Комментарий (необязательно)" value={qnote} onChange={(e) => setQnote(e.target.value)} />
          <button className="btn-primary w-full" onClick={submitQuote}>Отправить котировку</button>
        </div>
      )}

      {/* Котировки */}
      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold">Котировки · {rfq.quotes.length}</h2>
          {isBuyer && rfq.status === 'OPEN' && <button className="btn-ghost text-sm" onClick={close}>Закрыть запрос</button>}
        </div>
        {rfq.quotes.length === 0 ? (
          <div className="py-8 text-center text-ink-subtle">Котировок пока нет</div>
        ) : (
          <div className="space-y-2">
            {rfq.quotes.map((q: any, idx: number) => (
              <div key={q.id} className={`card flex items-center justify-between p-4 ${q.isAwarded ? 'ring-1 ring-emerald-300' : ''}`}>
                <div>
                  <div className="flex items-center gap-2 font-medium">
                    {q.seller?.company ?? 'Поставщик'}
                    {q.seller?.isVerified && <ShieldCheck size={14} className="text-teal-700" />}
                    {idx === 0 && rfq.quotes.length > 1 && <span className="rounded bg-teal-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">лучшая цена</span>}
                    {q.isAwarded && <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700"><Trophy size={11} /> выбран</span>}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-ink-subtle">
                    {q.leadTimeDays != null && <span className="inline-flex items-center gap-1"><Truck size={12} /> {q.leadTimeDays} дн.</span>}
                    {q.note && <span>· {q.note}</span>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-heading text-lg font-bold">{formatMoney(q.totalPrice)}</div>
                  {isBuyer && rfq.status === 'OPEN' && (
                    <button className="btn-primary mt-1 !px-3 !py-1 text-xs" onClick={() => award(q.id)}>Выбрать</button>
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
