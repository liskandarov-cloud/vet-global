'use client';

import { useState } from 'react';
import { Stethoscope } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

const ANIMALS = [
  { value: '', label: '— вид животного —' },
  { value: 'POULTRY', label: 'Птица' },
  { value: 'CATTLE', label: 'КРС' },
  { value: 'SMALL_RUMINANTS', label: 'МРС' },
  { value: 'HORSES', label: 'Лошади' },
  { value: 'PETS', label: 'Кошки/собаки' },
  { value: 'OTHER', label: 'Другое' },
];

export default function ConsultPage() {
  const [form, setForm] = useState({ fullName: '', phone: '', topic: '', animalType: '', message: '' });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const upd = (k: string) => (e: any) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/consultations', { ...form, animalType: form.animalType || undefined });
      setSent(true);
      toast.success('Заявка на консультацию отправлена');
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Ошибка отправки');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <div className="mb-6 flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-teal-50 text-teal-700"><Stethoscope size={22} /></span>
        <div>
          <h1 className="font-heading text-2xl font-extrabold">Ветеринарная консультация</h1>
          <p className="text-sm text-ink-muted">Задайте вопрос — наш специалист свяжется с вами.</p>
        </div>
      </div>

      {sent ? (
        <div className="card p-8 text-center">
          <div className="text-lg font-semibold text-teal-700">Спасибо! Заявка принята.</div>
          <p className="mt-2 text-ink-muted">Мы свяжемся с вами в ближайшее время.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="card space-y-4 p-6">
          <input className="input" placeholder="ФИО" value={form.fullName} onChange={upd('fullName')} required />
          <input className="input" placeholder="Телефон" value={form.phone} onChange={upd('phone')} required />
          <input className="input" placeholder="Тема (напр. «вакцинация птицы»)" value={form.topic} onChange={upd('topic')} required />
          <select className="input" value={form.animalType} onChange={upd('animalType')}>
            {ANIMALS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
          <textarea className="input !h-auto py-2" rows={4} placeholder="Опишите ваш вопрос" value={form.message} onChange={upd('message')} required />
          <button className="btn-primary w-full" disabled={loading}>{loading ? '…' : 'Отправить'}</button>
        </form>
      )}
    </div>
  );
}
