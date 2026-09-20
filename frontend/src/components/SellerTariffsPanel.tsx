'use client';

import { useEffect, useState } from 'react';
import { Trash2, Truck, Store } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

interface Tariff {
  id: string;
  method: 'COURIER' | 'PICKUP';
  // Пустая строка — тариф по умолчанию: применяется ко всем городам, кроме тех,
  // для которых заведён свой.
  city: string;
  cost: number;
  freeFrom: number | null;
  isActive: boolean;
  note?: string | null;
}

const CITIES = ['Ташкент', 'Самарканд', 'Бухара', 'Наманган', 'Андижан', 'Фергана', 'Нукус', 'Карши', 'Термез', 'Урганч', 'Навои', 'Джизак', 'Гулистан'];

export function SellerTariffsPanel() {
  const { tt } = useI18n();
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [form, setForm] = useState({ city: '', cost: '', freeFrom: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    api.get('/delivery/tariffs/mine').then((r) => setTariffs(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    // Пустое поле — не ноль. Number('') даёт 0, и пустая форма сохраняла тариф
    // с нулевой стоимостью: продавец, не заполнив цену, обещал покупателям
    // бесплатную доставку. Явный ноль остаётся допустимым — это «вожу бесплатно».
    const raw = form.cost.trim();
    const cost = Number(raw);
    if (!raw || !Number.isFinite(cost) || cost < 0) {
      toast.error(tt('Укажите стоимость доставки', 'Yetkazib berish narxini kiriting'));
      return;
    }
    setSaving(true);
    try {
      await api.post('/delivery/tariffs', {
        method: 'COURIER',
        city: form.city.trim() || undefined,
        cost,
        // Пустое поле — порога нет: бесплатной доставки не обещаем.
        freeFrom: form.freeFrom.trim() ? Number(form.freeFrom) : undefined,
      });
      toast.success(tt('Тариф сохранён', 'Tarif saqlandi'));
      setForm({ city: '', cost: '', freeFrom: '' });
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? tt('Ошибка', 'Xatolik'));
    } finally {
      setSaving(false);
    }
  };

  const del = async (id: string) => {
    if (!confirm(tt('Удалить тариф?', 'Tarif oʻchirilsinmi?'))) return;
    try { await api.delete(`/delivery/tariffs/${id}`); load(); } catch { toast.error(tt('Ошибка', 'Xatolik')); }
  };

  const hasDefault = tariffs.some((t) => !t.city.trim() && t.method === 'COURIER');

  return (
    <div className="mt-6">
      <p className="mb-3 text-sm text-ink-muted">
        {tt(
          'Покупатель видит стоимость доставки ещё в корзине и платит её вместе с заказом. Без тарифа доставку придётся согласовывать вручную после оформления.',
          'Xaridor yetkazib berish narxini savatchada koʻradi va buyurtma bilan birga toʻlaydi. Tarif boʻlmasa, narxni buyurtmadan keyin qoʻlda kelishish kerak.',
        )}
      </p>

      <div className="card mb-4 space-y-3 p-4">
        <div className="flex items-center gap-2 font-medium"><Truck size={18} className="text-teal-700" /> {tt('Тариф курьерской доставки', 'Kuryer yetkazib berish tarifi')}</div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-ink-muted">{tt('Город', 'Shahar')}</label>
            <input
              className="input"
              list="vg-tariff-cities"
              placeholder={tt('пусто — все города', 'boʻsh — barcha shaharlar')}
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
            <datalist id="vg-tariff-cities">{CITIES.map((c) => <option key={c} value={c} />)}</datalist>
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink-muted">{tt('Стоимость, сум', 'Narxi, soʻm')}</label>
            <input className="input" type="number" min={0} placeholder="45000" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink-muted">{tt('Бесплатно от суммы заказа', 'Buyurtma summasidan bepul')}</label>
            <input className="input" type="number" min={0} placeholder={tt('необязательно', 'majburiy emas')} value={form.freeFrom} onChange={(e) => setForm({ ...form, freeFrom: e.target.value })} />
          </div>
        </div>
        <p className="text-xs text-ink-subtle">
          {tt(
            'Тариф с городом важнее тарифа без города. Порог бесплатной доставки считается от суммы всего заказа.',
            'Shaharli tarif shahar koʻrsatilmagan tarifdan ustun. Bepul yetkazib berish chegarasi butun buyurtma summasidan hisoblanadi.',
          )}
        </p>
        <button className="btn-primary" disabled={saving} onClick={save}>
          {saving ? '…' : tt('Сохранить тариф', 'Tarifni saqlash')}
        </button>
      </div>

      {/* Без тарифа по умолчанию доставка в города без своей строки остаётся
          непосчитанной — покупатель увидит «уточняется», а не цифру. */}
      {tariffs.length > 0 && !hasDefault && (
        <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
          {tt(
            'Нет тарифа без города: в остальные города доставку посчитать нечем. Добавьте строку с пустым городом.',
            'Shahar koʻrsatilmagan tarif yoʻq: boshqa shaharlarga narx hisoblanmaydi. Shahari boʻsh qatorni qoʻshing.',
          )}
        </p>
      )}

      {tariffs.length === 0 ? (
        <p className="text-sm text-ink-subtle">{tt('Тарифов пока нет.', 'Hozircha tariflar yoʻq.')}</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-xs text-ink-muted">
              <tr>
                <th className="px-3 py-2">{tt('Способ', 'Usul')}</th>
                <th className="px-3 py-2">{tt('Город', 'Shahar')}</th>
                <th className="px-3 py-2">{tt('Стоимость', 'Narxi')}</th>
                <th className="px-3 py-2">{tt('Бесплатно от', 'Bepul chegarasi')}</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {tariffs.map((t) => (
                <tr key={t.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1 text-ink-muted">
                      {t.method === 'PICKUP' ? <Store size={13} /> : <Truck size={13} />}
                      {t.method === 'PICKUP' ? tt('Самовывоз', 'Oʻzi olib ketish') : tt('Курьер', 'Kuryer')}
                    </span>
                  </td>
                  <td className="px-3 py-2">{t.city.trim() || <span className="text-ink-subtle">{tt('все города', 'barcha shaharlar')}</span>}</td>
                  <td className="px-3 py-2">{formatMoney(t.cost)}</td>
                  <td className="px-3 py-2">{t.freeFrom == null ? <span className="text-ink-subtle">—</span> : formatMoney(t.freeFrom)}</td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => del(t.id)} className="text-red-500 hover:text-red-600" title={tt('Удалить', 'Oʻchirish')}>
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
