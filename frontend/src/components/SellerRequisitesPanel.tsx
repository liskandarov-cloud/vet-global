'use client';

import { useEffect, useState } from 'react';
import { Save, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

// Реквизиты поставщика для счёта на оплату: без банковских данных по счёту
// нельзя сделать перевод. Заполняется здесь, подставляется в PDF.
interface Form {
  company: string;
  inn: string;
  bankName: string;
  bankAccount: string;
  bankMfo: string;
  vatPayer: boolean;
}

const EMPTY: Form = { company: '', inn: '', bankName: '', bankAccount: '', bankMfo: '', vatPayer: false };

export function SellerRequisitesPanel() {
  const { tt } = useI18n();
  const [form, setForm] = useState<Form>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/auth/me').then((r) => {
      const u = r.data;
      setForm({
        company: u.company ?? '', inn: u.inn ?? '', bankName: u.bankName ?? '',
        bankAccount: u.bankAccount ?? '', bankMfo: u.bankMfo ?? '', vatPayer: !!u.vatPayer,
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const upd = (k: keyof Form, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await api.patch('/users/me', form);
      toast.success(tt('Реквизиты сохранены — попадут в счёт', 'Rekvizitlar saqlandi — hisob-fakturaga tushadi'));
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? tt('Ошибка', 'Xatolik'));
    } finally { setSaving(false); }
  };

  if (loading) return <div className="mt-6 py-10 text-center text-ink-subtle">{tt('Загрузка…', 'Yuklanmoqda…')}</div>;

  return (
    <div className="mt-6 max-w-xl">
      <div className="mb-3 flex items-center gap-2 text-sm text-ink-muted">
        <Building2 size={16} className="text-teal-700" />
        {tt('Эти данные подставляются в счёт на оплату (PDF).', 'Bu maʼlumotlar toʻlov hisob-fakturasiga (PDF) qoʻyiladi.')}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-ink-muted">{tt('Название компании', 'Kompaniya nomi')}</label>
          <input className="input" value={form.company} onChange={(e) => upd('company', e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink-muted">{tt('ИНН', 'INN')}</label>
          <input className="input" value={form.inn} onChange={(e) => upd('inn', e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink-muted">{tt('МФО банка', 'Bank MFO')}</label>
          <input className="input" value={form.bankMfo} onChange={(e) => upd('bankMfo', e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-ink-muted">{tt('Название банка', 'Bank nomi')}</label>
          <input className="input" value={form.bankName} onChange={(e) => upd('bankName', e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-ink-muted">{tt('Расчётный счёт (р/с)', 'Hisob raqami (h/r)')}</label>
          <input className="input" value={form.bankAccount} onChange={(e) => upd('bankAccount', e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={form.vatPayer} onChange={(e) => upd('vatPayer', e.target.checked)} className="h-4 w-4 accent-teal-600" />
          {tt('Плательщик НДС (ҚҚС 12%) — показывать в счёте', 'QQS toʻlovchisi (12%) — hisob-fakturada koʻrsatish')}
        </label>
      </div>
      <button className="btn-primary mt-4" disabled={saving} onClick={save}>
        <Save size={16} /> {saving ? '…' : tt('Сохранить', 'Saqlash')}
      </button>
    </div>
  );
}
