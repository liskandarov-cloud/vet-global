'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Trash2, FileQuestion, Gavel } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/store';

const STATUS: Record<string, { label: string; cls: string }> = {
  OPEN: { label: 'Открыт', cls: 'bg-teal-50 text-teal-700' },
  AWARDED: { label: 'Поставщик выбран', cls: 'bg-emerald-50 text-emerald-700' },
  CLOSED: { label: 'Закрыт', cls: 'bg-slate-100 text-ink-subtle' },
};

export default function RfqPage() {
  const { user, ready } = useAuth();

  if (ready && !user) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <FileQuestion size={40} className="mx-auto text-ink-subtle" />
        <p className="mt-4 text-ink-muted">Войдите, чтобы работать с запросами цен (RFQ).</p>
        <Link href="/login" className="btn-primary mt-6 inline-flex">Войти</Link>
      </div>
    );
  }

  const isSeller = user?.role === 'SELLER';
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6">
        <span className="eyebrow">Тендер</span>
        <h1 className="mt-3 section-title">Запросы цен (RFQ)</h1>
        <p className="mt-2 text-ink-muted">
          {isSeller ? 'Открытые запросы покупателей — предложите свою цену.' : 'Опишите потребность — поставщики предложат цены, вы выберете лучшую.'}
        </p>
      </div>
      {isSeller ? <SellerRfq /> : <BuyerRfq />}
    </div>
  );
}

function BuyerRfq() {
  const [rfqs, setRfqs] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [items, setItems] = useState<{ name: string; quantity: number }[]>([{ name: '', quantity: 1 }]);
  const [submitting, setSubmitting] = useState(false);

  const load = () => api.get('/rfq/mine').then((r) => setRfqs(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const submit = async () => {
    const valid = items.filter((i) => i.name.trim());
    if (!title.trim() || valid.length === 0) { toast.error('Заполните название и хотя бы одну позицию'); return; }
    setSubmitting(true);
    try {
      await api.post('/rfq', { title, note, items: valid });
      toast.success('Запрос опубликован');
      setTitle(''); setNote(''); setItems([{ name: '', quantity: 1 }]);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Ошибка');
    } finally { setSubmitting(false); }
  };

  return (
    <>
      <div className="card space-y-3 p-5">
        <div className="font-medium">Новый запрос</div>
        <input className="input" placeholder="Название (напр. «Вакцины для птицефабрики, Q3»)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="input" rows={2} placeholder="Комментарий (условия, сроки) — необязательно" value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={i} className="flex gap-2">
              <input className="input flex-1" placeholder="Позиция" value={it.name} onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
              <input className="input w-24" type="number" min={1} value={it.quantity} onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, quantity: Number(e.target.value) || 1 } : x))} />
              {items.length > 1 && (
                <button className="grid w-10 place-items-center rounded-lg text-ink-subtle hover:text-red-500" onClick={() => setItems(items.filter((_, j) => j !== i))}><Trash2 size={16} /></button>
              )}
            </div>
          ))}
          <button className="btn-ghost text-sm" onClick={() => setItems([...items, { name: '', quantity: 1 }])}><Plus size={14} /> Добавить позицию</button>
        </div>
        <button className="btn-primary w-full" disabled={submitting} onClick={submit}>{submitting ? '…' : 'Опубликовать запрос'}</button>
      </div>

      <div className="mt-6 space-y-2">
        {rfqs.map((r) => (
          <Link key={r.id} href={`/rfq/${r.id}`} className="card card-hover flex items-center justify-between p-4">
            <div>
              <div className="font-medium">{r.title}</div>
              <div className="text-xs text-ink-subtle">{r.items?.length ?? 0} позиций · {new Date(r.createdAt).toLocaleDateString('ru-RU')}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1 text-sm text-teal-700"><Gavel size={14} /> {r._count?.quotes ?? 0} котировок</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS[r.status]?.cls}`}>{STATUS[r.status]?.label}</span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}

function SellerRfq() {
  const [rfqs, setRfqs] = useState<any[]>([]);
  useEffect(() => { api.get('/rfq/open').then((r) => setRfqs(r.data)).catch(() => {}); }, []);

  if (rfqs.length === 0) return <div className="py-16 text-center text-ink-subtle">Открытых запросов нет</div>;
  return (
    <div className="space-y-2">
      {rfqs.map((r) => (
        <Link key={r.id} href={`/rfq/${r.id}`} className="card card-hover flex items-center justify-between p-4">
          <div>
            <div className="font-medium">{r.title}</div>
            <div className="text-xs text-ink-subtle">{r.buyer?.company ?? r.buyer?.fullName} · {r.items?.length ?? 0} позиций</div>
          </div>
          {r.myQuote ? (
            <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">Ваша ставка: {r.myQuote.totalPrice.toLocaleString('ru-RU')}</span>
          ) : (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">Дать котировку</span>
          )}
        </Link>
      ))}
    </div>
  );
}
