'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { RefreshCw, Play, Pause, Trash2, Repeat, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/store';
import { useI18n } from '@/lib/i18n';

interface Sub {
  id: string;
  quantity: number;
  intervalDays: number;
  nextRunAt: string;
  active: boolean;
  lastOrderId?: string | null;
  product?: { id: string; name: string; images?: string[] };
}

export default function SubscriptionsPage() {
  const { user, ready } = useAuth();
  const { tt } = useI18n();
  const [subs, setSubs] = useState<Sub[]>([]);

  const load = () => api.get('/subscriptions').then((r) => setSubs(r.data)).catch(() => {});
  useEffect(() => { if (user) load(); }, [user]);

  if (ready && !user) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <Repeat size={40} className="mx-auto text-ink-subtle" />
        <p className="mt-4 text-ink-muted">{tt('Войдите, чтобы настроить автопополнение.', 'Avto toʻldirishni sozlash uchun kiring.')}</p>
        <Link href="/login" className="btn-primary mt-6 inline-flex">{tt('Войти', 'Kirish')}</Link>
      </div>
    );
  }

  const toggle = async (s: Sub) => {
    try { await api.patch(`/subscriptions/${s.id}`, { active: !s.active }); load(); }
    catch { toast.error(tt('Ошибка', 'Xatolik')); }
  };
  const runNow = async (s: Sub) => {
    try { const { data } = await api.post(`/subscriptions/${s.id}/run`); toast.success(tt('Заказ создан', 'Buyurtma yaratildi')); load(); if (data.orderId) window.location.href = `/orders/${data.orderId}`; }
    catch (e: any) { toast.error(e?.response?.data?.message ?? tt('Ошибка', 'Xatolik')); }
  };
  const del = async (s: Sub) => {
    if (!confirm(tt('Удалить подписку?', 'Obunani oʻchirilsinmi?'))) return;
    try { await api.delete(`/subscriptions/${s.id}`); load(); }
    catch { toast.error(tt('Ошибка', 'Xatolik')); }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6">
        <span className="eyebrow">{tt('Автопополнение', 'Avto toʻldirish')}</span>
        <h1 className="mt-3 section-title">{tt('Регулярные поставки', 'Muntazam yetkazib berishlar')}</h1>
        <p className="mt-2 text-ink-muted">{tt('Заказы формируются автоматически по расписанию — цена берётся актуальная у поставщика.', 'Buyurtmalar jadval boʻyicha avtomatik shakllanadi — narx yetkazib beruvchidan dolzarb holda olinadi.')}</p>
      </div>

      {subs.length === 0 ? (
        <div className="card p-8 text-center text-ink-subtle">
          {tt('Подписок нет. Оформите автопополнение на странице товара.', 'Obunalar yoʻq. Mahsulot sahifasida avto toʻldirishni rasmiylashtiring.')}
          <div className="mt-4"><Link href="/catalog" className="btn-primary inline-flex">{tt('В каталог', 'Katalogga')}</Link></div>
        </div>
      ) : (
        <div className="space-y-2">
          {subs.map((s) => (
            <div key={s.id} className={`card flex flex-wrap items-center justify-between gap-3 p-4 ${!s.active ? 'opacity-60' : ''}`}>
              <div className="min-w-[180px]">
                <Link href={`/products/${s.product?.id}`} className="font-medium hover:text-teal-700">{s.product?.name ?? tt('Товар', 'Mahsulot')}</Link>
                <div className="text-xs text-ink-subtle">
                  {s.quantity} {tt('шт', 'dona')} · {tt(`каждые ${s.intervalDays} дн`, `har ${s.intervalDays} kunda`)} · {s.active ? tt(`след. ${new Date(s.nextRunAt).toLocaleDateString('ru-RU')}`, `keyingi ${new Date(s.nextRunAt).toLocaleDateString('ru-RU')}`) : tt('на паузе', 'pauzada')}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="btn-outline !px-3 !py-1.5 text-xs" onClick={() => runNow(s)}><ShoppingCart size={14} /> {tt('Заказать сейчас', 'Hozir buyurtma berish')}</button>
                <button className="grid h-8 w-8 place-items-center rounded-lg text-ink-subtle hover:bg-slate-100" title={s.active ? tt('Пауза', 'Pauza') : tt('Возобновить', 'Davom ettirish')} onClick={() => toggle(s)}>
                  {s.active ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <button className="grid h-8 w-8 place-items-center rounded-lg text-ink-subtle hover:text-red-500" onClick={() => del(s)}><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
