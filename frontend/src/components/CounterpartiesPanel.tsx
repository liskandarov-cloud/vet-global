'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, Star, Building2, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

interface Counterparty {
  id: string;
  name: string;
  inn: string;
  mfo?: string;
  bankAccount?: string;
  address?: string;
  isDefault: boolean;
}

const EMPTY = { name: '', inn: '', mfo: '', bankAccount: '', address: '', isDefault: false };

export function CounterpartiesPanel() {
  const { tt } = useI18n();
  const [items, setItems] = useState<Counterparty[]>([]);
  const [form, setForm] = useState<any>(EMPTY);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => api.get('/users/me/counterparties').then((r) => setItems(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const upd = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name || !form.inn) return toast.error(tt('Укажите название и ИНН', 'Nomi va INNni kiriting'));
    setSaving(true);
    try {
      await api.post('/users/me/counterparties', {
        ...form,
        mfo: form.mfo || undefined,
        bankAccount: form.bankAccount || undefined,
        address: form.address || undefined,
      });
      toast.success(tt('Юрлицо добавлено', 'Yuridik shaxs qoʻshildi'));
      setForm(EMPTY);
      setOpen(false);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? tt('Ошибка', 'Xatolik'));
    } finally {
      setSaving(false);
    }
  };

  const del = async (id: string) => {
    if (!confirm(tt('Удалить юрлицо?', 'Yuridik shaxs oʻchirilsinmi?'))) return;
    await api.delete(`/users/me/counterparties/${id}`);
    load();
  };

  const makeDefault = async (c: Counterparty) => {
    await api.patch(`/users/me/counterparties/${c.id}`, { name: c.name, inn: c.inn, mfo: c.mfo, bankAccount: c.bankAccount, address: c.address, isDefault: true });
    load();
  };

  return (
    <div className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-heading text-xl font-bold">{tt('Реквизиты (юрлица)', 'Rekvizitlar (yuridik shaxslar)')}</h2>
        <button className="btn-secondary !py-1.5 text-sm" onClick={() => setOpen(true)}><Plus size={15} /> {tt('Добавить', 'Qoʻshish')}</button>
      </div>

      {items.length === 0 ? (
        <div className="card p-6 text-sm text-ink-subtle">
          {tt('Добавьте юрлицо (ИНН, МФО, расчётный счёт) — реквизиты подставятся в договор и счёт, а при оформлении заказа можно будет выбрать контрагента.', 'Yuridik shaxs qoʻshing (INN, MFO, hisob raqami) — rekvizitlar shartnoma va hisob-fakturaga qoʻyiladi, buyurtma rasmiylashtirishda kontragentni tanlash mumkin boʻladi.')}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((c) => (
            <div key={c.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 font-medium">
                  <Building2 size={16} className="text-teal-700" /> {c.name}
                  {c.isDefault && <span className="rounded bg-teal-100 px-2 py-0.5 text-xs text-teal-700">{tt('по умолчанию', 'standart')}</span>}
                </div>
                <div className="flex gap-1">
                  {!c.isDefault && <button className="btn-ghost !px-2 !py-1" title={tt('Сделать основным', 'Asosiy qilish')} onClick={() => makeDefault(c)}><Star size={14} /></button>}
                  <button className="btn-ghost !px-2 !py-1 text-red-500" onClick={() => del(c.id)}><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="mt-2 space-y-0.5 text-sm text-ink-muted">
                <div>{tt('ИНН', 'INN')}: {c.inn}</div>
                {c.mfo && <div>{tt('МФО', 'MFO')}: {c.mfo}</div>}
                {c.bankAccount && <div>{tt('Р/с', 'Hisob raqami')}: {c.bankAccount}</div>}
                {c.address && <div>{c.address}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-8 w-full max-w-md rounded-2xl bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-heading text-lg font-bold">{tt('Новое юрлицо', 'Yangi yuridik shaxs')}</h3>
              <button onClick={() => setOpen(false)}><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <input className="input" placeholder={tt('Название юрлица', 'Yuridik shaxs nomi')} value={form.name} onChange={(e) => upd('name', e.target.value)} />
              <input className="input" placeholder={tt('ИНН', 'INN')} value={form.inn} onChange={(e) => upd('inn', e.target.value)} />
              <input className="input" placeholder={tt('МФО банка', 'Bank MFO')} value={form.mfo} onChange={(e) => upd('mfo', e.target.value)} />
              <input className="input" placeholder={tt('Расчётный счёт', 'Hisob raqami')} value={form.bankAccount} onChange={(e) => upd('bankAccount', e.target.value)} />
              <input className="input" placeholder={tt('Адрес', 'Manzil')} value={form.address} onChange={(e) => upd('address', e.target.value)} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isDefault} onChange={(e) => upd('isDefault', e.target.checked)} className="h-4 w-4 accent-teal-600" />
                {tt('Использовать по умолчанию', 'Standart sifatida ishlatish')}
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setOpen(false)}>{tt('Отмена', 'Bekor qilish')}</button>
              <button className="btn-primary" disabled={saving} onClick={save}>{saving ? '…' : tt('Сохранить', 'Saqlash')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
