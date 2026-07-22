'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Trash2, FileQuestion, Gavel } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/store';
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

export default function RfqPage() {
  const { user, ready } = useAuth();
  const { tt } = useI18n();

  if (ready && !user) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <FileQuestion size={40} className="mx-auto text-ink-subtle" />
        <p className="mt-4 text-ink-muted">{tt('Войдите, чтобы работать с запросами цен (RFQ).', 'Narx soʻrovlari (RFQ) bilan ishlash uchun kiring.')}</p>
        <Link href="/login" className="btn-primary mt-6 inline-flex">{tt('Войти', 'Kirish')}</Link>
      </div>
    );
  }

  const isSeller = user?.role === 'SELLER';
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6">
        <span className="eyebrow">{tt('Тендер', 'Tender')}</span>
        <h1 className="mt-3 section-title">{tt('Запросы цен (RFQ)', 'Narx soʻrovlari (RFQ)')}</h1>
        <p className="mt-2 text-ink-muted">
          {isSeller ? tt('Открытые запросы покупателей — предложите свою цену.', 'Xaridorlarning ochiq soʻrovlari — oʻz narxingizni taklif qiling.') : tt('Опишите потребность — поставщики предложат цены, вы выберете лучшую.', 'Ehtiyojni tavsiflang — yetkazib beruvchilar narx taklif qiladi, siz eng yaxshisini tanlaysiz.')}
        </p>
      </div>
      {isSeller ? <SellerRfq /> : <BuyerRfq />}
    </div>
  );
}

function BuyerRfq() {
  const { tt } = useI18n();
  const [rfqs, setRfqs] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [items, setItems] = useState<{ name: string; quantity: number; unit: string }[]>([{ name: '', quantity: 1, unit: 'шт' }]);
  const [submitting, setSubmitting] = useState(false);

  const load = () => api.get('/rfq/mine').then((r) => setRfqs(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const submit = async () => {
    const valid = items.filter((i) => i.name.trim());
    if (!title.trim() || valid.length === 0) { toast.error(tt('Заполните название и хотя бы одну позицию', 'Nomi va kamida bitta pozitsiyani toʻldiring')); return; }
    setSubmitting(true);
    try {
      await api.post('/rfq', { title, note, items: valid });
      toast.success(tt('Запрос опубликован — он ниже в списке «Мои запросы»', 'Soʻrov eʼlon qilindi — u «Mening soʻrovlarim» roʻyxatida'));
      setTitle(''); setNote(''); setItems([{ name: '', quantity: 1, unit: 'шт' }]);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? tt('Ошибка', 'Xatolik'));
    } finally { setSubmitting(false); }
  };

  return (
    <>
      <div className="card space-y-3 p-5">
        <div className="font-medium">{tt('Новый запрос', 'Yangi soʻrov')}</div>
        <input className="input" placeholder={tt('Название (напр. «Вакцины для птицефабрики, Q3»)', 'Nomi (masalan, «Parranda fabrikasi uchun vaksinalar, Q3»)')} value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="input" rows={2} placeholder={tt('Комментарий (условия, сроки) — необязательно', 'Izoh (shartlar, muddatlar) — ixtiyoriy')} value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="space-y-2">
          <div className="flex gap-2 text-xs font-medium text-ink-subtle">
            <span className="flex-1">{tt('Наименование', 'Nomi')}</span>
            <span className="w-20 text-center">{tt('Кол-во', 'Miqdor')}</span>
            <span className="w-24 text-center">{tt('Ед. изм.', 'Oʻlchov')}</span>
            {items.length > 1 && <span className="w-10" />}
          </div>
          {items.map((it, i) => (
            <div key={i} className="flex gap-2">
              <input className="input flex-1" placeholder={tt('напр. Вакцина НБ Ла-Сота', 'masalan, NB La-Sota vaksinasi')} value={it.name} onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
              <input className="input w-20 text-center" type="number" min={1} value={it.quantity} onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, quantity: Number(e.target.value) || 1 } : x))} />
              <select className="input w-24" value={it.unit} onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, unit: e.target.value } : x))}>
                {['шт', 'флакон', 'доз', 'л', 'мл', 'кг', 'г', 'уп'].map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
              {items.length > 1 && (
                <button className="grid w-10 place-items-center rounded-lg text-ink-subtle hover:text-red-500" onClick={() => setItems(items.filter((_, j) => j !== i))}><Trash2 size={16} /></button>
              )}
            </div>
          ))}
          <button className="btn-ghost text-sm" onClick={() => setItems([...items, { name: '', quantity: 1, unit: 'шт' }])}><Plus size={14} /> {tt('Добавить позицию', 'Pozitsiya qoʻshish')}</button>
        </div>
        <button className="btn-primary w-full" disabled={submitting} onClick={submit}>{submitting ? '…' : tt('Опубликовать запрос', 'Soʻrovni eʼlon qilish')}</button>
      </div>

      <div className="mt-8">
        <h2 className="mb-3 font-heading text-lg font-bold">{tt('Мои запросы', 'Mening soʻrovlarim')}</h2>
        {rfqs.length === 0 ? (
          <div className="card p-6 text-center text-sm text-ink-subtle">
            {tt('Пока нет запросов. Заполните форму выше и опубликуйте — запрос появится здесь, а поставщики предложат цены.',
                'Hozircha soʻrovlar yoʻq. Yuqoridagi shaklni toʻldiring va eʼlon qiling — soʻrov shu yerda paydo boʻladi.')}
          </div>
        ) : (
          <div className="space-y-2">
            {rfqs.map((r) => (
              <Link key={r.id} href={`/rfq/${r.id}`} className="card card-hover flex items-center justify-between p-4">
                <div>
                  <div className="font-medium">{r.title}</div>
                  <div className="text-xs text-ink-subtle">{r.items?.length ?? 0} {tt('позиций', 'pozitsiya')} · {new Date(r.createdAt).toLocaleDateString('ru-RU')}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1 text-sm text-teal-700"><Gavel size={14} /> {r._count?.quotes ?? 0} {tt('котировок', 'kotirovka')}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS[r.status]?.cls}`}>{tt(STATUS[r.status]?.label, STATUS_UZ[r.status])}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function SellerRfq() {
  const { tt } = useI18n();
  const [rfqs, setRfqs] = useState<any[]>([]);
  useEffect(() => { api.get('/rfq/open').then((r) => setRfqs(r.data)).catch(() => {}); }, []);

  if (rfqs.length === 0) return <div className="py-16 text-center text-ink-subtle">{tt('Открытых запросов нет', 'Ochiq soʻrovlar yoʻq')}</div>;
  return (
    <div className="space-y-2">
      {rfqs.map((r) => (
        <Link key={r.id} href={`/rfq/${r.id}`} className="card card-hover flex items-center justify-between p-4">
          <div>
            <div className="font-medium">{r.title}</div>
            <div className="text-xs text-ink-subtle">{r.buyer?.company ?? r.buyer?.fullName} · {r.items?.length ?? 0} {tt('позиций', 'pozitsiya')}</div>
          </div>
          {r.myQuote ? (
            <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">{tt('Ваша ставка', 'Sizning taklifingiz')}: {r.myQuote.totalPrice.toLocaleString('ru-RU')}</span>
          ) : (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">{tt('Дать котировку', 'Kotirovka berish')}</span>
          )}
        </Link>
      ))}
    </div>
  );
}
