'use client';

import { useEffect, useState } from 'react';
import { Phone } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

interface Lead {
  id: string;
  createdAt: string;
  fullName: string;
  phone: string;
  productId?: string | null;
  productName?: string | null;
  quantity?: number | null;
  message?: string | null;
  source: string;
  status: 'NEW' | 'CONTACTED' | 'CLOSED';
}

// Заявки покупателей на товары продавца: «Запросить у поставщика» с сайта,
// заявки из бота. Раньше продавец видел их только в уведомлении.
export function SellerLeadsPanel() {
  const { tt } = useI18n();
  const [leads, setLeads] = useState<Lead[]>([]);
  const load = () => api.get('/leads/mine').then((r) => setLeads(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const status: Record<Lead['status'], string> = {
    NEW: tt('Новая', 'Yangi'),
    CONTACTED: tt('Связались', 'Bogʻlanildi'),
    CLOSED: tt('Закрыта', 'Yopilgan'),
  };
  const setStatus = async (id: string, s: Lead['status']) => {
    try {
      await api.patch(`/leads/mine/${id}`, { status: s });
      setLeads((xs) => xs.map((x) => (x.id === id ? { ...x, status: s } : x)));
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? tt('Ошибка', 'Xatolik'));
    }
  };

  return (
    <div className="mt-6">
      <p className="mb-3 text-sm text-ink-muted">
        {tt('Запросы покупателей по вашим товарам — с сайта («Запросить у поставщика») и из Telegram-бота. Перезвоните и отметьте статус.', 'Mahsulotlaringiz boʻyicha xaridorlar soʻrovlari — saytdan («Yetkazib beruvchidan soʻrash») va Telegram-botdan. Qoʻngʻiroq qiling va holatini belgilang.')}
      </p>
      {leads.length === 0 ? (
        <div className="rounded-lg border border-slate-100 py-8 text-center text-sm text-ink-subtle">{tt('Заявок пока нет', 'Hozircha arizalar yoʻq')}</div>
      ) : (
        <div className="space-y-2">
          {leads.map((l) => (
            <div key={l.id} className={`rounded-lg border p-3 text-sm ${l.status === 'NEW' ? 'border-teal-200 bg-teal-50/40' : 'border-slate-100'}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-medium">{l.productName ?? tt('Без товара', 'Mahsulotsiz')}{l.quantity ? ` · ${l.quantity} ${tt('шт', 'dona')}` : ''}</div>
                <select className="input !w-auto !py-1 text-xs" value={l.status} onChange={(e) => setStatus(l.id, e.target.value as Lead['status'])}>
                  {(Object.keys(status) as Lead['status'][]).map((s) => <option key={s} value={s}>{status[s]}</option>)}
                </select>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-muted">
                <span>{l.fullName}</span>
                <a href={`tel:${l.phone.replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-1 text-teal-700 hover:underline"><Phone size={13} /> {l.phone}</a>
                <span className="text-xs text-ink-subtle">{new Date(l.createdAt).toLocaleString('ru-RU')} · {l.source === 'TELEGRAM' ? 'Telegram' : tt('Сайт', 'Sayt')}</span>
              </div>
              {l.message && <div className="mt-1 text-xs text-ink-muted">{l.message}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
