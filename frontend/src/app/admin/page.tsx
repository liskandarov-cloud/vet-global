'use client';

import { useEffect, useState } from 'react';
import { Check, Ban, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { RoleGuard, StatCard } from '@/components/RoleGuard';
import { formatMoney } from '@/lib/utils';

function AdminContent() {
  const [tab, setTab] = useState<'overview' | 'users' | 'reviews'>('overview');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);

  const load = () => {
    api.get('/admin/stats').then((r) => setStats(r.data)).catch(() => {});
    api.get('/admin/users').then((r) => setUsers(r.data.users));
    api.get('/reviews/pending').then((r) => setReviews(r.data)).catch(() => {});
  };
  useEffect(load, []);

  const verify = async (id: string) => { await api.patch(`/admin/users/${id}/verify`, { isVerified: true }); toast.success('Подтверждён'); load(); };
  const ban = async (id: string, isBanned: boolean) => { await api.patch(`/admin/users/${id}/ban`, { isBanned }); toast.success(isBanned ? 'Заблокирован' : 'Разблокирован'); load(); };
  const approve = async (id: string) => { await api.patch(`/reviews/${id}/approve`, { isApproved: true }); toast.success('Опубликован'); load(); };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-6 font-heading text-3xl font-extrabold">Админ-панель</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="GMV (оборот)" value={formatMoney(stats?.gmv ?? 0)} accent />
        <StatCard label="Комиссия платформы" value={formatMoney(stats?.commission ?? 0)} accent />
        <StatCard label="Пользователей" value={String(stats?.totalUsers ?? 0)} />
        <StatCard label="Заказов" value={String(stats?.totalOrders ?? 0)} />
      </div>

      <div className="mt-8 flex gap-2 border-b border-slate-200">
        {[['overview', 'Обзор'], ['users', `Пользователи${stats?.pendingSellers ? ` (${stats.pendingSellers})` : ''}`], ['reviews', `Отзывы${reviews.length ? ` (${reviews.length})` : ''}`]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k as any)}
            className={`px-4 py-2 font-medium ${tab === k ? 'border-b-2 border-teal-600 text-teal-700' : 'text-ink-muted'}`}>{l}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="card p-5">
            <h3 className="mb-3 font-semibold">Топ поставщиков</h3>
            {(stats?.topSellers ?? []).map((s: any, i: number) => (
              <div key={s.id} className="flex items-center justify-between border-b border-slate-50 py-2 text-sm">
                <span>{i + 1}. {s.company}</span>
                <span className="font-semibold">{formatMoney(s.revenue)}</span>
              </div>
            ))}
            {!stats?.topSellers?.length && <div className="text-sm text-ink-subtle">Нет данных</div>}
          </div>
          <div className="card p-5">
            <h3 className="mb-3 font-semibold">Сводка</h3>
            <div className="space-y-2 text-sm">
              <Row l="Поставщиков" v={stats?.totalSellers ?? 0} />
              <Row l="Покупателей" v={stats?.totalBuyers ?? 0} />
              <Row l="Товаров" v={stats?.totalProducts ?? 0} />
              <Row l="Доставлено заказов" v={stats?.deliveredOrders ?? 0} />
              <Row l="На модерации (продавцы)" v={stats?.pendingSellers ?? 0} />
              <Row l="Отзывов на модерации" v={stats?.pendingReviews ?? 0} />
            </div>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-ink-subtle">
              <tr className="border-b border-slate-100"><th className="py-2">Имя</th><th>Роль</th><th>Компания</th><th>Статус</th><th></th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-slate-50">
                  <td className="py-2">{u.fullName}<div className="text-xs text-ink-subtle">{u.email}</div></td>
                  <td>{u.role}</td>
                  <td>{u.company ?? '—'}</td>
                  <td>
                    {u.isBanned ? <span className="text-red-500">Заблокирован</span>
                      : u.isVerified ? <span className="inline-flex items-center gap-1 text-teal-700"><ShieldCheck size={14} />Проверен</span>
                      : <span className="text-amber-600">Не проверен</span>}
                  </td>
                  <td className="flex gap-2 py-2">
                    {!u.isVerified && u.role === 'SELLER' && <button className="btn-ghost !px-2 !py-1 text-teal-700" onClick={() => verify(u.id)}><Check size={15} /></button>}
                    {u.role !== 'ADMIN' && <button className="btn-ghost !px-2 !py-1 text-red-500" onClick={() => ban(u.id, !u.isBanned)}><Ban size={15} /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'reviews' && (
        <div className="mt-6 space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="card flex items-center justify-between p-4">
              <div>
                <div className="font-medium">{r.buyerName} · {r.rating}★</div>
                <p className="text-sm text-ink-muted">{r.comment}</p>
              </div>
              <button className="btn-primary !px-3 !py-2" onClick={() => approve(r.id)}><Check size={16} /> Одобрить</button>
            </div>
          ))}
          {reviews.length === 0 && <div className="py-10 text-center text-ink-subtle">Нет отзывов на модерации</div>}
        </div>
      )}
    </div>
  );
}

function Row({ l, v }: { l: string; v: number | string }) {
  return <div className="flex justify-between"><span className="text-ink-muted">{l}</span><span className="font-semibold">{v}</span></div>;
}

export default function AdminDashboard() {
  return <RoleGuard role="ADMIN"><AdminContent /></RoleGuard>;
}
