'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, Star, Building2, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

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
  const [items, setItems] = useState<Counterparty[]>([]);
  const [form, setForm] = useState<any>(EMPTY);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => api.get('/users/me/counterparties').then((r) => setItems(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const upd = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name || !form.inn) return toast.error('Укажите название и ИНН');
    setSaving(true);
    try {
      await api.post('/users/me/counterparties', {
        ...form,
        mfo: form.mfo || undefined,
        bankAccount: form.bankAccount || undefined,
        address: form.address || undefined,
      });
      toast.success('Юрлицо добавлено');
      setForm(EMPTY);
      setOpen(false);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  const del = async (id: string) => {
    if (!confirm('Удалить юрлицо?')) return;
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
        <h2 className="font-heading text-xl font-bold">Реквизиты (юрлица)</h2>
        <button className="btn-secondary !py-1.5 text-sm" onClick={() => setOpen(true)}><Plus size={15} /> Добавить</button>
      </div>

      {items.length === 0 ? (
        <div className="card p-6 text-sm text-ink-subtle">
          Добавьте юрлицо (ИНН, МФО, расчётный счёт) — реквизиты подставятся в договор и счёт, а при оформлении заказа можно будет выбрать контрагента.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((c) => (
            <div key={c.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 font-medium">
                  <Building2 size={16} className="text-teal-700" /> {c.name}
                  {c.isDefault && <span className="rounded bg-teal-100 px-2 py-0.5 text-xs text-teal-700">по умолчанию</span>}
                </div>
                <div className="flex gap-1">
                  {!c.isDefault && <button className="btn-ghost !px-2 !py-1" title="Сделать основным" onClick={() => makeDefault(c)}><Star size={14} /></button>}
                  <button className="btn-ghost !px-2 !py-1 text-red-500" onClick={() => del(c.id)}><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="mt-2 space-y-0.5 text-sm text-ink-muted">
                <div>ИНН: {c.inn}</div>
                {c.mfo && <div>МФО: {c.mfo}</div>}
                {c.bankAccount && <div>Р/с: {c.bankAccount}</div>}
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
              <h3 className="font-heading text-lg font-bold">Новое юрлицо</h3>
              <button onClick={() => setOpen(false)}><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <input className="input" placeholder="Название юрлица" value={form.name} onChange={(e) => upd('name', e.target.value)} />
              <input className="input" placeholder="ИНН" value={form.inn} onChange={(e) => upd('inn', e.target.value)} />
              <input className="input" placeholder="МФО банка" value={form.mfo} onChange={(e) => upd('mfo', e.target.value)} />
              <input className="input" placeholder="Расчётный счёт" value={form.bankAccount} onChange={(e) => upd('bankAccount', e.target.value)} />
              <input className="input" placeholder="Адрес" value={form.address} onChange={(e) => upd('address', e.target.value)} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isDefault} onChange={(e) => upd('isDefault', e.target.checked)} className="h-4 w-4 accent-teal-600" />
                Использовать по умолчанию
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setOpen(false)}>Отмена</button>
              <button className="btn-primary" disabled={saving} onClick={save}>{saving ? '…' : 'Сохранить'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
