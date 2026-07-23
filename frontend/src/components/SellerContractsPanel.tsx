'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, Handshake } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

interface Contract {
  id: string;
  offerId: string;
  price: number;
  note?: string | null;
  validUntil?: string | null;
  productName: string;
  buyer: { id: string; fullName: string; company?: string; email: string };
}
interface MyOffer { id: string; price: number; product?: { name: string } }

export function SellerContractsPanel() {
  const { tt } = useI18n();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [offers, setOffers] = useState<MyOffer[]>([]);
  const [form, setForm] = useState({ offerId: '', buyerEmail: '', price: 0, validUntil: '' });

  const load = () => {
    api.get('/contract-prices/seller').then((r) => setContracts(r.data)).catch(() => {});
    api.get('/offers/mine').then((r) => setOffers(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.offerId || !form.buyerEmail || form.price <= 0) { toast.error(tt('Заполните оффер, email и цену', 'Taklif, email va narxni toʻldiring')); return; }
    try {
      await api.post('/contract-prices', {
        offerId: form.offerId,
        buyerEmail: form.buyerEmail,
        price: Number(form.price),
        validUntil: form.validUntil || undefined,
      });
      toast.success(tt('Договорная цена сохранена', 'Shartnoma narxi saqlandi'));
      setForm({ offerId: '', buyerEmail: '', price: 0, validUntil: '' });
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? tt('Ошибка', 'Xatolik'));
    }
  };
  const del = async (id: string) => {
    if (!confirm(tt('Удалить договорную цену?', 'Shartnoma narxi oʻchirilsinmi?'))) return;
    try { await api.delete(`/contract-prices/${id}`); load(); } catch { toast.error(tt('Ошибка', 'Xatolik')); }
  };

  return (
    <div className="mt-6">
      <p className="mb-3 text-sm text-ink-muted">{tt('Назначайте персональные цены ключевым покупателям — они увидят их автоматически и в заказе.', 'Asosiy xaridorlar uchun shaxsiy narxlar belgilang — ular buni avtomatik va buyurtmada koʻradi.')}</p>

      <div className="card mb-4 space-y-3 p-4">
        <div className="flex items-center gap-2 font-medium"><Handshake size={18} className="text-teal-700" /> {tt('Новая договорная цена', 'Yangi shartnoma narxi')}</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-ink-muted">{tt('Ваш оффер (товар)', 'Sizning taklifingiz (mahsulot)')}</label>
            <select className="input" value={form.offerId} onChange={(e) => setForm({ ...form, offerId: e.target.value })}>
              <option value="">{tt('— выберите —', '— tanlang —')}</option>
              {offers.map((o) => <option key={o.id} value={o.id}>{o.product?.name ?? o.id} · {formatMoney(o.price)}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink-muted">{tt('Email покупателя', 'Xaridor email')}</label>
            <input className="input" placeholder="buyer@company.uz" value={form.buyerEmail} onChange={(e) => setForm({ ...form, buyerEmail: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink-muted">{tt('Договорная цена, сум', 'Shartnoma narxi, soʻm')}</label>
            <input className="input" type="number" min={0} placeholder={tt('напр. 480000', 'masalan, 480000')}
              value={form.price || ''}
              onChange={(e) => setForm({ ...form, price: e.target.value === '' ? 0 : Number(e.target.value) })} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink-muted">{tt('Действует до (необязательно)', 'Amal qilish muddati (ixtiyoriy)')}</label>
            <input className="input" type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} />
          </div>
        </div>
        <button className="btn-primary" onClick={create}><Plus size={16} /> {tt('Сохранить', 'Saqlash')}</button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-ink-subtle">
            <tr className="border-b border-slate-100"><th className="py-2">{tt('Товар', 'Mahsulot')}</th><th>{tt('Покупатель', 'Xaridor')}</th><th>{tt('Цена', 'Narx')}</th><th>{tt('До', 'Muddat')}</th><th></th></tr>
          </thead>
          <tbody>
            {contracts.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-ink-subtle">{tt('Договорных цен нет', 'Shartnoma narxlari yoʻq')}</td></tr>}
            {contracts.map((c) => (
              <tr key={c.id} className="border-b border-slate-50">
                <td className="py-2">{c.productName}</td>
                <td>{c.buyer.company ?? c.buyer.fullName}<div className="text-xs text-ink-subtle">{c.buyer.email}</div></td>
                <td className="font-semibold text-emerald-700">{formatMoney(c.price)}</td>
                <td className="text-ink-subtle">{c.validUntil ? new Date(c.validUntil).toLocaleDateString('ru-RU') : tt('бессрочно', 'muddatsiz')}</td>
                <td><button className="btn-ghost !px-2 !py-1 text-red-500" onClick={() => del(c.id)}><Trash2 size={15} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
