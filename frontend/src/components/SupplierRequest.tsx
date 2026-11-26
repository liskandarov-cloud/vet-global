'use client';

import { useEffect, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/store';
import { useI18n } from '@/lib/i18n';

// Запрос поставщику по товару с ценой «по запросу»: заявка уходит продавцу
// товара и команде площадки (в кабинет и Telegram), поставщик перезванивает
// с ценой и сроком. Открывается сразу по ссылке …#request из карточки.
export function SupplierRequest({ productId, productName, qty }: { productId: string; productName: string; qty: number }) {
  const { tt } = useI18n();
  const user = useAuth((s) => s.user);
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ fullName: user?.fullName ?? '', phone: user?.phone ?? '', quantity: String(qty), message: '' });

  useEffect(() => {
    if (window.location.hash === '#request') setOpen(true);
  }, []);

  const send = async () => {
    if (!form.fullName.trim() || form.phone.replace(/\D/g, '').length < 9) {
      toast.error(tt('Укажите имя и телефон', 'Ism va telefonni kiriting'));
      return;
    }
    try {
      await api.post('/leads', {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        productId,
        quantity: Math.max(1, Math.floor(Number(form.quantity)) || 1),
        message: form.message.trim() || `Запрос цены и наличия: ${productName}`,
      });
      setSent(true);
      toast.success(tt('Запрос отправлен — поставщик свяжется с вами', 'Soʻrov yuborildi — yetkazib beruvchi siz bilan bogʻlanadi'));
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? tt('Не удалось отправить запрос', 'Soʻrovni yuborib boʻlmadi'));
    }
  };

  if (sent) {
    return <div id="request" className="mt-4 rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm text-teal-800">{tt('Запрос отправлен. Поставщик свяжется с вами и назовёт цену и срок.', 'Soʻrov yuborildi. Yetkazib beruvchi siz bilan bogʻlanib, narx va muddatni aytadi.')}</div>;
  }
  return (
    <div id="request" className="mt-4">
      {!open ? (
        <button className="btn-primary w-full" onClick={() => setOpen(true)}>
          <MessageSquare size={18} /> {tt('Запросить у поставщика', 'Yetkazib beruvchidan soʻrash')}
        </button>
      ) : (
        <div className="space-y-2 rounded-lg border border-slate-200 p-3">
          <div className="text-sm font-medium">{tt('Запрос цены и наличия', 'Narx va mavjudlik soʻrovi')}</div>
          <input className="input" placeholder={tt('Имя', 'Ism')} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          <input className="input" type="tel" placeholder="+998 __ ___ __ __" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input className="input" type="number" min={1} placeholder={tt('Количество', 'Miqdor')} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          <textarea className="input min-h-[64px]" placeholder={tt('Комментарий (необязательно)', 'Izoh (ixtiyoriy)')} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          <button className="btn-primary w-full" onClick={send}><MessageSquare size={16} /> {tt('Отправить запрос', 'Soʻrov yuborish')}</button>
        </div>
      )}
    </div>
  );
}
