'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { RefreshCw, Play, Pause, Trash2, Repeat, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/store';

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
  const [subs, setSubs] = useState<Sub[]>([]);

  const load = () => api.get('/subscriptions').then((r) => setSubs(r.data)).catch(() => {});
  useEffect(() => { if (user) load(); }, [user]);

  if (ready && !user) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <Repeat size={40} className="mx-auto text-ink-subtle" />
        <p className="mt-4 text-ink-muted">Войдите, чтобы настроить автопополнение.</p>
        <Link href="/login" className="btn-primary mt-6 inline-flex">Войти</Link>
      </div>
    );
  }

  const toggle = async (s: Sub) => {
    try { await api.patch(`/subscriptions/${s.id}`, { active: !s.active }); load(); }
    catch { toast.error('Ошибка'); }
  };
  const runNow = async (s: Sub) => {
    try { const { data } = await api.post(`/subscriptions/${s.id}/run`); toast.success('Заказ создан'); load(); if (data.orderId) window.location.href = `/orders/${data.orderId}`; }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Ошибка'); }
  };
  const del = async (s: Sub) => {
    if (!confirm('Удалить подписку?')) return;
    try { await api.delete(`/subscriptions/${s.id}`); load(); }
    catch { toast.error('Ошибка'); }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6">
        <span className="eyebrow">Автопополнение</span>
        <h1 className="mt-3 section-title">Регулярные поставки</h1>
        <p className="mt-2 text-ink-muted">Заказы формируются автоматически по расписанию — цена берётся актуальная у поставщика.</p>
      </div>

      {subs.length === 0 ? (
        <div className="card p-8 text-center text-ink-subtle">
          Подписок нет. Оформите автопополнение на странице товара.
          <div className="mt-4"><Link href="/catalog" className="btn-primary inline-flex">В каталог</Link></div>
        </div>
      ) : (
        <div className="space-y-2">
          {subs.map((s) => (
            <div key={s.id} className={`card flex flex-wrap items-center justify-between gap-3 p-4 ${!s.active ? 'opacity-60' : ''}`}>
              <div className="min-w-[180px]">
                <Link href={`/products/${s.product?.id}`} className="font-medium hover:text-teal-700">{s.product?.name ?? 'Товар'}</Link>
                <div className="text-xs text-ink-subtle">
                  {s.quantity} шт · каждые {s.intervalDays} дн · {s.active ? `след. ${new Date(s.nextRunAt).toLocaleDateString('ru-RU')}` : 'на паузе'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="btn-outline !px-3 !py-1.5 text-xs" onClick={() => runNow(s)}><ShoppingCart size={14} /> Заказать сейчас</button>
                <button className="grid h-8 w-8 place-items-center rounded-lg text-ink-subtle hover:bg-slate-100" title={s.active ? 'Пауза' : 'Возобновить'} onClick={() => toggle(s)}>
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
