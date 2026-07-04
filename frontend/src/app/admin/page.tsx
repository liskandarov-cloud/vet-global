'use client';

import { useEffect, useState } from 'react';
import { Check, Ban, ShieldCheck, TrendingUp, Percent, Users, ShoppingCart, Download } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { RoleGuard, StatCard } from '@/components/RoleGuard';
import { WeeklyBars } from '@/components/Charts';
import { formatMoney } from '@/lib/utils';

const LEAD_STATUS: Record<string, string> = { NEW: 'Новая', CONTACTED: 'В работе', CLOSED: 'Закрыта' };
const CONSULT_STATUS: Record<string, string> = { NEW: 'Новая', IN_PROGRESS: 'В работе', ANSWERED: 'Отвечено', CLOSED: 'Закрыта' };

function AdminContent() {
  const [tab, setTab] = useState<'overview' | 'billing' | 'users' | 'reviews' | 'leads' | 'consults'>('overview');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [consults, setConsults] = useState<any[]>([]);
  const [billing, setBilling] = useState<any>(null);

  const load = () => {
    api.get('/admin/stats').then((r) => setStats(r.data)).catch(() => {});
    api.get('/admin/users').then((r) => setUsers(r.data.users));
    api.get('/reviews/pending').then((r) => setReviews(r.data)).catch(() => {});
    api.get('/leads').then((r) => setLeads(r.data)).catch(() => {});
    api.get('/consultations').then((r) => setConsults(r.data)).catch(() => {});
    api.get('/admin/billing').then((r) => setBilling(r.data)).catch(() => {});
  };

  const exportBilling = async () => {
    const { data } = await api.get('/admin/billing/export', { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'billing.xlsx'; a.click();
    URL.revokeObjectURL(url);
  };
  useEffect(load, []);

  const newLeads = leads.filter((l) => l.status === 'NEW').length;
  const newConsults = consults.filter((c) => c.status === 'NEW').length;

  const answerConsult = async (id: string) => {
    const answer = window.prompt('Ответ клиенту:');
    if (answer == null) return;
    await api.patch(`/consultations/${id}`, { answer, status: 'ANSWERED' });
    toast.success('Ответ сохранён');
    load();
  };

  const verify = async (id: string) => { await api.patch(`/admin/users/${id}/verify`, { isVerified: true }); toast.success('Подтверждён'); load(); };
  const ban = async (id: string, isBanned: boolean) => { await api.patch(`/admin/users/${id}/ban`, { isBanned }); toast.success(isBanned ? 'Заблокирован' : 'Разблокирован'); load(); };
  const approve = async (id: string) => { await api.patch(`/reviews/${id}/approve`, { isApproved: true }); toast.success('Опубликован'); load(); };
  const setLeadStatus = async (id: string, status: string) => { await api.patch(`/leads/${id}`, { status }); load(); };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6">
        <span className="eyebrow">Управление</span>
        <h1 className="mt-3 section-title">Админ-панель</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="GMV (оборот)" value={formatMoney(stats?.gmv ?? 0)} accent icon={TrendingUp} />
        <StatCard label="Комиссия платформы" value={formatMoney(stats?.commission ?? 0)} accent icon={Percent} />
        <StatCard label="Пользователей" value={String(stats?.totalUsers ?? 0)} icon={Users} />
        <StatCard label="Заказов" value={String(stats?.totalOrders ?? 0)} icon={ShoppingCart} />
      </div>

      <div className="mt-8 flex gap-2 overflow-x-auto border-b border-slate-200">
        {[['overview', 'Обзор'], ['billing', 'Биллинг'], ['leads', `Заявки${newLeads ? ` (${newLeads})` : ''}`], ['consults', `Консультации${newConsults ? ` (${newConsults})` : ''}`], ['users', `Пользователи${stats?.pendingSellers ? ` (${stats.pendingSellers})` : ''}`], ['reviews', `Отзывы${reviews.length ? ` (${reviews.length})` : ''}`]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k as any)}
            className={`whitespace-nowrap px-4 py-2 font-medium ${tab === k ? 'border-b-2 border-teal-600 text-teal-700' : 'text-ink-muted'}`}>{l}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
        <div className="mt-6">
          <WeeklyBars data={stats?.ordersByWeek ?? []} title="Заказы по неделям (платформа)" />
        </div>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
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
        </>
      )}

      {tab === 'billing' && (
        <div className="mt-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm text-ink-muted">Комиссия платформы: <b>{billing?.commissionPercent ?? 12}%</b></div>
            <button className="btn-secondary" onClick={exportBilling}><Download size={16} /> Excel</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-ink-subtle">
                <tr className="border-b border-slate-100"><th className="py-2">Поставщик</th><th>Заказов</th><th>Оборот</th><th>Комиссия</th><th>К выплате</th></tr>
              </thead>
              <tbody>
                {(billing?.rows ?? []).map((r: any) => (
                  <tr key={r.sellerId} className="border-b border-slate-50">
                    <td className="py-2">{r.company}</td>
                    <td>{r.orders}</td>
                    <td>{formatMoney(r.revenue)}</td>
                    <td className="text-secondary">{formatMoney(r.commission)}</td>
                    <td className="font-semibold">{formatMoney(r.payout)}</td>
                  </tr>
                ))}
                {billing?.totals && billing.rows.length > 0 && (
                  <tr className="border-t-2 border-slate-200 font-bold">
                    <td className="py-2">Итого</td>
                    <td></td>
                    <td>{formatMoney(billing.totals.revenue)}</td>
                    <td className="text-secondary">{formatMoney(billing.totals.commission)}</td>
                    <td className="text-teal-700">{formatMoney(billing.totals.payout)}</td>
                  </tr>
                )}
              </tbody>
            </table>
            {!billing?.rows?.length && <div className="py-10 text-center text-ink-subtle">Нет данных</div>}
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

      {tab === 'leads' && (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-ink-subtle">
              <tr className="border-b border-slate-100"><th className="py-2">Дата</th><th>Источник</th><th>Клиент</th><th>Товар</th><th>Статус</th></tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id} className="border-b border-slate-50">
                  <td className="py-2">{new Date(l.createdAt).toLocaleDateString('ru-RU')}</td>
                  <td><span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs">{l.source === 'TELEGRAM' ? 'Telegram' : 'Сайт'}</span></td>
                  <td>{l.fullName}<div className="text-xs text-ink-subtle">{l.phone}</div></td>
                  <td>{l.productName ?? '—'}{l.quantity ? ` × ${l.quantity}` : ''}</td>
                  <td>
                    <select className="input !h-9 !w-auto" value={l.status} onChange={(e) => setLeadStatus(l.id, e.target.value)}>
                      {Object.entries(LEAD_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {leads.length === 0 && <div className="py-10 text-center text-ink-subtle">Заявок пока нет</div>}
        </div>
      )}

      {tab === 'consults' && (
        <div className="mt-6 space-y-3">
          {consults.map((c) => (
            <div key={c.id} className="card p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-medium">{c.topic} <span className="text-xs text-ink-subtle">· {c.fullName} ({c.phone})</span></div>
                  <p className="mt-1 text-sm text-ink-muted">{c.message}</p>
                  {c.answer && <p className="mt-2 rounded-lg bg-teal-50 p-2 text-sm text-teal-800"><b>Ответ:</b> {c.answer}</p>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`rounded-md px-2 py-0.5 text-xs ${c.status === 'ANSWERED' ? 'bg-teal-100 text-teal-700' : c.status === 'NEW' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100'}`}>
                    {CONSULT_STATUS[c.status]}
                  </span>
                  <button className="btn-secondary !px-3 !py-1.5 text-xs" onClick={() => answerConsult(c.id)}>Ответить</button>
                </div>
              </div>
            </div>
          ))}
          {consults.length === 0 && <div className="py-10 text-center text-ink-subtle">Консультаций пока нет</div>}
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
