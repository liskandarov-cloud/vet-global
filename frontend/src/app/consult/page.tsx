'use client';

import { useState } from 'react';
import { Stethoscope } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

export default function ConsultPage() {
  const { tt } = useI18n();
  const ANIMALS = [
    { value: '', label: tt('— вид животного —', '— hayvon turi —') },
    { value: 'POULTRY', label: tt('Птица', 'Parranda') },
    { value: 'CATTLE', label: tt('КРС', 'YKM') },
    { value: 'SMALL_RUMINANTS', label: tt('МРС', 'MKM') },
    { value: 'HORSES', label: tt('Лошади', 'Otlar') },
    { value: 'PETS', label: tt('Кошки/собаки', 'Mushuk/itlar') },
    { value: 'OTHER', label: tt('Другое', 'Boshqa') },
  ];
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
      toast.success(tt('Заявка на консультацию отправлена', 'Konsultatsiya soʻrovi yuborildi'));
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? tt('Ошибка отправки', 'Yuborishda xato'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <div className="mb-6 flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-teal-50 text-teal-700"><Stethoscope size={22} /></span>
        <div>
          <h1 className="font-heading text-2xl font-extrabold">{tt('Ветеринарная консультация', 'Veterinar maslahat')}</h1>
          <p className="text-sm text-ink-muted">{tt('Задайте вопрос — наш специалист свяжется с вами.', 'Savol bering — mutaxassisimiz siz bilan bogʻlanadi.')}</p>
        </div>
      </div>

      {sent ? (
        <div className="card p-8 text-center">
          <div className="text-lg font-semibold text-teal-700">{tt('Спасибо! Заявка принята.', 'Rahmat! Soʻrov qabul qilindi.')}</div>
          <p className="mt-2 text-ink-muted">{tt('Мы свяжемся с вами в ближайшее время.', 'Tez orada siz bilan bogʻlanamiz.')}</p>
        </div>
      ) : (
        <form onSubmit={submit} className="card space-y-4 p-6">
          <input className="input" placeholder={tt('ФИО', 'FISH')} value={form.fullName} onChange={upd('fullName')} required />
          <input className="input" placeholder={tt('Телефон', 'Telefon')} value={form.phone} onChange={upd('phone')} required />
          <input className="input" placeholder={tt('Тема (напр. «вакцинация птицы»)', 'Mavzu (masalan, «parranda vaksinatsiyasi»)')} value={form.topic} onChange={upd('topic')} required />
          <select className="input" value={form.animalType} onChange={upd('animalType')}>
            {ANIMALS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
          <textarea className="input !h-auto py-2" rows={4} placeholder={tt('Опишите ваш вопрос', 'Savolingizni yozing')} value={form.message} onChange={upd('message')} required />
          <button className="btn-primary w-full" disabled={loading}>{loading ? '…' : tt('Отправить', 'Yuborish')}</button>
        </form>
      )}
    </div>
  );
}
