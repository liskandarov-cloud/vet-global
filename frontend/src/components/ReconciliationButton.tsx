'use client';

import { useState } from 'react';
import { FileSpreadsheet, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

// Акт сверки с контрагентом за период: продавцу — с покупателем, покупателю —
// с продавцом. Бухгалтерии покупателя-юрлица без него не закрыть месяц.
export function ReconciliationButton() {
  const { tt } = useI18n();
  const [open, setOpen] = useState(false);
  const [parties, setParties] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({ with: '', from: `${new Date().getFullYear()}-01-01`, to: new Date().toISOString().slice(0, 10) });

  const show = () => {
    setOpen(true);
    api.get('/orders/reconciliation/parties')
      .then((r) => { setParties(r.data); setForm((f) => ({ ...f, with: f.with || r.data[0]?.id || '' })); })
      .catch(() => {});
  };

  const download = async () => {
    try {
      const { data } = await api.get('/orders/reconciliation', { params: form, responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `akt-sverki-${form.from}-${form.to}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      setOpen(false);
    } catch {
      toast.error(tt('Не удалось сформировать акт — проверьте контрагента и период', 'Dalolatnomani tuzib boʻlmadi — kontragent va davrni tekshiring'));
    }
  };

  return (
    <>
      <button className="btn-secondary" onClick={show}><FileSpreadsheet size={16} /> {tt('Акт сверки', 'Solishtirish dalolatnomasi')}</button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-heading text-lg font-bold">{tt('Акт сверки', 'Solishtirish dalolatnomasi')}</h3>
              <button aria-label={tt('Закрыть', 'Yopish')} onClick={() => setOpen(false)}><X size={20} /></button>
            </div>
            {parties.length === 0 ? (
              <p className="text-sm text-ink-muted">{tt('Заказов с контрагентами пока нет.', 'Hozircha kontragentlar bilan buyurtmalar yoʻq.')}</p>
            ) : (
              <div className="space-y-3 text-sm">
                <label className="block">
                  <span className="mb-1 block text-xs text-ink-muted">{tt('Контрагент', 'Kontragent')}</span>
                  <select className="input" value={form.with} onChange={(e) => setForm({ ...form, with: e.target.value })}>
                    {parties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1 block text-xs text-ink-muted">{tt('С', 'Dan')}</span>
                    <input className="input" type="date" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs text-ink-muted">{tt('По', 'Gacha')}</span>
                    <input className="input" type="date" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} />
                  </label>
                </div>
                <button className="btn-primary w-full" onClick={download}><FileSpreadsheet size={16} /> {tt('Скачать Excel', 'Excel yuklab olish')}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
