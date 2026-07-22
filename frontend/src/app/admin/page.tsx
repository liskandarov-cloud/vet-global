'use client';

import { useEffect, useState } from 'react';
import { Check, Ban, ShieldCheck, TrendingUp, Percent, Users, ShoppingCart, Download, Plus, Pencil, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { RoleGuard, StatCard } from '@/components/RoleGuard';
import { WeeklyBars } from '@/components/Charts';
import { formatMoney } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

function AdminContent() {
  const { tt } = useI18n();
  const LEAD_STATUS: Record<string, string> = { NEW: tt('Новая', 'Yangi'), CONTACTED: tt('В работе', 'Jarayonda'), CLOSED: tt('Закрыта', 'Yopilgan') };
  const CONSULT_STATUS: Record<string, string> = { NEW: tt('Новая', 'Yangi'), IN_PROGRESS: tt('В работе', 'Jarayonda'), ANSWERED: tt('Отвечено', 'Javob berildi'), CLOSED: tt('Закрыта', 'Yopilgan') };
  const [tab, setTab] = useState<'overview' | 'billing' | 'orders' | 'rfq' | 'certs' | 'users' | 'reviews' | 'leads' | 'consults' | 'blog'>('overview');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [consults, setConsults] = useState<any[]>([]);
  const [billing, setBilling] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [certQueue, setCertQueue] = useState<any[]>([]);
  const [rfqs, setRfqs] = useState<any[]>([]);
  const [editingPost, setEditingPost] = useState<any | null>(null);

  const load = () => {
    api.get('/admin/stats').then((r) => setStats(r.data)).catch(() => {});
    api.get('/admin/users').then((r) => setUsers(r.data.users));
    api.get('/reviews/pending').then((r) => setReviews(r.data)).catch(() => {});
    api.get('/leads').then((r) => setLeads(r.data)).catch(() => {});
    api.get('/consultations').then((r) => setConsults(r.data)).catch(() => {});
    api.get('/admin/billing').then((r) => setBilling(r.data)).catch(() => {});
    api.get('/blog', { params: { all: true, limit: 100 } }).then((r) => setPosts(r.data.posts)).catch(() => {});
    api.get('/orders').then((r) => setOrders(r.data)).catch(() => {});
    api.get('/offers/verification-queue').then((r) => setCertQueue(r.data)).catch(() => {});
    api.get('/rfq/all').then((r) => setRfqs(r.data)).catch(() => {});
  };

  const delPost = async (id: string) => {
    if (!confirm(tt('Удалить публикацию?', 'Nashr oʻchirilsinmi?'))) return;
    await api.delete(`/blog/${id}`);
    toast.success(tt('Удалено', 'Oʻchirildi'));
    load();
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
    const answer = window.prompt(tt('Ответ клиенту:', 'Mijozga javob:'));
    if (answer == null) return;
    await api.patch(`/consultations/${id}`, { answer, status: 'ANSWERED' });
    toast.success(tt('Ответ сохранён', 'Javob saqlandi'));
    load();
  };

  const verify = async (id: string) => { await api.patch(`/admin/users/${id}/verify`, { isVerified: true }); toast.success(tt('Подтверждён', 'Tasdiqlandi')); load(); };
  const delUser = async (id: string, email: string) => {
    if (!confirm(tt(`Удалить пользователя ${email}? Его заказы и данные будут удалены безвозвратно.`,
                    `${email} foydalanuvchisi oʻchirilsinmi? Buyurtmalari va maʼlumotlari butunlay oʻchiriladi.`))) return;
    try {
      await api.delete(`/admin/users/${id}`);
      toast.success(tt('Пользователь удалён', 'Foydalanuvchi oʻchirildi'));
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? tt('Ошибка', 'Xatolik'));
    }
  };
  const ban = async (id: string, isBanned: boolean) => { await api.patch(`/admin/users/${id}/ban`, { isBanned }); toast.success(isBanned ? tt('Заблокирован', 'Bloklandi') : tt('Разблокирован', 'Blokdan chiqarildi')); load(); };
  const approve = async (id: string) => { await api.patch(`/reviews/${id}/approve`, { isApproved: true }); toast.success(tt('Опубликован', 'Chop etildi')); load(); };
  const setLeadStatus = async (id: string, status: string) => { await api.patch(`/leads/${id}`, { status }); load(); };
  const ORDER_STATUS: Record<string, string> = {
    PENDING: tt('Новый', 'Yangi'), CONFIRMED: tt('Подтверждён', 'Tasdiqlangan'), PROCESSING: tt('В обработке', 'Qayta ishlanmoqda'),
    SHIPPED: tt('Отгружен', 'Joʻnatildi'), DELIVERED: tt('Доставлен', 'Yetkazildi'), CANCELLED: tt('Отменён', 'Bekor qilindi'),
  };
  const setOrderStatus = async (id: string, status: string) => {
    try { await api.patch(`/orders/${id}/status`, { status }); toast.success(tt('Статус обновлён', 'Holat yangilandi')); load(); }
    catch (e: any) { toast.error(e?.response?.data?.message ?? tt('Ошибка', 'Xatolik')); }
  };
  const delOrder = async (id: string) => {
    if (!confirm(tt('Удалить заказ безвозвратно?', 'Buyurtma butunlay oʻchirilsinmi?'))) return;
    await api.delete(`/orders/${id}`);
    toast.success(tt('Заказ удалён', 'Buyurtma oʻchirildi'));
    load();
  };
  const orderInvoice = async (id: string) => {
    const { data } = await api.get(`/orders/${id}/invoice`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
    const a = document.createElement('a'); a.href = url; a.download = `invoice-${id.slice(0, 8)}.pdf`; a.click();
    URL.revokeObjectURL(url);
  };
  const verifyOffer = async (id: string) => {
    await api.post(`/offers/${id}/verify`, { verified: true });
    toast.success(tt('Подлинность подтверждена', 'Haqiqiyligi tasdiqlandi'));
    load();
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6">
        <span className="eyebrow">{tt('Управление', 'Boshqaruv')}</span>
        <h1 className="mt-3 section-title">{tt('Админ-панель', 'Admin panel')}</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={tt('GMV (оборот)', 'GMV (aylanma)')} value={formatMoney(stats?.gmv ?? 0)} accent icon={TrendingUp} />
        <StatCard label={tt('Комиссия платформы', 'Platforma komissiyasi')} value={formatMoney(stats?.commission ?? 0)} accent icon={Percent} />
        <StatCard label={tt('Пользователей', 'Foydalanuvchilar')} value={String(stats?.totalUsers ?? 0)} icon={Users} />
        <StatCard label={tt('Заказов', 'Buyurtmalar')} value={String(stats?.totalOrders ?? 0)} icon={ShoppingCart} />
      </div>

      <div className="mt-8 flex gap-2 overflow-x-auto border-b border-slate-200">
        {[['overview', tt('Обзор', 'Umumiy')], ['billing', tt('Биллинг', 'Billing')], ['orders', `${tt('Заказы', 'Buyurtmalar')}${orders.length ? ` (${orders.length})` : ''}`], ['rfq', `${tt('Запросы цен', 'Narx soʻrovlari')}${rfqs.length ? ` (${rfqs.length})` : ''}`], ['certs', `${tt('Сертификаты', 'Sertifikatlar')}${certQueue.length ? ` (${certQueue.length})` : ''}`], ['leads', `${tt('Заявки', 'Arizalar')}${newLeads ? ` (${newLeads})` : ''}`], ['consults', `${tt('Консультации', 'Konsultatsiyalar')}${newConsults ? ` (${newConsults})` : ''}`], ['users', `${tt('Пользователи', 'Foydalanuvchilar')}${stats?.pendingSellers ? ` (${stats.pendingSellers})` : ''}`], ['reviews', `${tt('Отзывы', 'Sharhlar')}${reviews.length ? ` (${reviews.length})` : ''}`], ['blog', tt('Блог', 'Blog')]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k as any)}
            className={`whitespace-nowrap px-4 py-2 font-medium ${tab === k ? 'border-b-2 border-teal-600 text-teal-700' : 'text-ink-muted'}`}>{l}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
        <div className="mt-6">
          <WeeklyBars data={stats?.ordersByWeek ?? []} title={tt('Заказы по неделям (платформа)', 'Haftalik buyurtmalar (platforma)')} />
        </div>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <div className="card p-5">
            <h3 className="mb-3 font-semibold">{tt('Топ поставщиков', 'Top yetkazib beruvchilar')}</h3>
            {(stats?.topSellers ?? []).map((s: any, i: number) => (
              <div key={s.id} className="flex items-center justify-between border-b border-slate-50 py-2 text-sm">
                <span>{i + 1}. {s.company}</span>
                <span className="font-semibold">{formatMoney(s.revenue)}</span>
              </div>
            ))}
            {!stats?.topSellers?.length && <div className="text-sm text-ink-subtle">{tt('Нет данных', 'Maʼlumot yoʻq')}</div>}
          </div>
          <div className="card p-5">
            <h3 className="mb-3 font-semibold">{tt('Сводка', 'Xulosa')}</h3>
            <div className="space-y-2 text-sm">
              <Row l={tt('Поставщиков', 'Yetkazib beruvchilar')} v={stats?.totalSellers ?? 0} />
              <Row l={tt('Покупателей', 'Xaridorlar')} v={stats?.totalBuyers ?? 0} />
              <Row l={tt('Товаров', 'Mahsulotlar')} v={stats?.totalProducts ?? 0} />
              <Row l={tt('Доставлено заказов', 'Yetkazilgan buyurtmalar')} v={stats?.deliveredOrders ?? 0} />
              <Row l={tt('На модерации (продавцы)', 'Moderatsiyada (sotuvchilar)')} v={stats?.pendingSellers ?? 0} />
              <Row l={tt('Отзывов на модерации', 'Moderatsiyadagi sharhlar')} v={stats?.pendingReviews ?? 0} />
            </div>
          </div>
        </div>
        </>
      )}

      {tab === 'billing' && (
        <div className="mt-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm text-ink-muted">{tt('Комиссия платформы', 'Platforma komissiyasi')}: <b>{billing?.commissionPercent ?? 12}%</b></div>
            <button className="btn-secondary" onClick={exportBilling}><Download size={16} /> Excel</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-ink-subtle">
                <tr className="border-b border-slate-100"><th className="py-2">{tt('Поставщик', 'Yetkazib beruvchi')}</th><th>{tt('Заказов', 'Buyurtmalar')}</th><th>{tt('Оборот', 'Aylanma')}</th><th>{tt('Комиссия', 'Komissiya')}</th><th>{tt('К выплате', 'Toʻlovga')}</th></tr>
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
                    <td className="py-2">{tt('Итого', 'Jami')}</td>
                    <td></td>
                    <td>{formatMoney(billing.totals.revenue)}</td>
                    <td className="text-secondary">{formatMoney(billing.totals.commission)}</td>
                    <td className="text-teal-700">{formatMoney(billing.totals.payout)}</td>
                  </tr>
                )}
              </tbody>
            </table>
            {!billing?.rows?.length && <div className="py-10 text-center text-ink-subtle">{tt('Нет данных', 'Maʼlumot yoʻq')}</div>}
          </div>
        </div>
      )}

      {tab === 'orders' && (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-ink-muted">
              <tr className="border-b border-slate-100">
                <th className="py-2 pr-3">№</th><th className="py-2 pr-3">{tt('Дата', 'Sana')}</th>
                <th className="py-2 pr-3">{tt('Покупатель', 'Xaridor')}</th><th className="py-2 pr-3">{tt('Позиций', 'Pozitsiyalar')}</th>
                <th className="py-2 pr-3">{tt('Сумма', 'Summa')}</th><th className="py-2 pr-3">{tt('Статус', 'Holat')}</th><th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-slate-50">
                  <td className="py-2 pr-3 font-mono text-xs">{o.id.slice(0, 8)}</td>
                  <td className="py-2 pr-3 whitespace-nowrap">{new Date(o.createdAt).toLocaleDateString('ru-RU')}</td>
                  <td className="py-2 pr-3">{o.buyerName}{o.buyerCompany ? ` · ${o.buyerCompany}` : ''}</td>
                  <td className="py-2 pr-3">{o.items?.length ?? 0}</td>
                  <td className="py-2 pr-3 font-semibold whitespace-nowrap">{formatMoney(o.total)}</td>
                  <td className="py-2 pr-3">
                    <select className="input !h-8 !py-0 text-xs" value={o.status} onChange={(e) => setOrderStatus(o.id, e.target.value)}>
                      {Object.entries(ORDER_STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </td>
                  <td className="py-2 whitespace-nowrap">
                    <button className="btn-ghost !px-2 !py-1" onClick={() => orderInvoice(o.id)} title={tt('Счёт PDF', 'Hisob PDF')}><Download size={15} /></button>
                    <button className="btn-ghost !px-2 !py-1 text-red-500" onClick={() => delOrder(o.id)} title={tt('Удалить', 'Oʻchirish')}><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.length === 0 && <div className="py-10 text-center text-ink-subtle">{tt('Заказов пока нет', 'Hozircha buyurtmalar yoʻq')}</div>}
        </div>
      )}

      {tab === 'rfq' && (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-ink-muted">
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <th className="py-2 pr-3">{tt('Дата', 'Sana')}</th><th className="py-2 pr-3">{tt('Название', 'Nomi')}</th>
                <th className="py-2 pr-3">{tt('Покупатель', 'Xaridor')}</th><th className="py-2 pr-3">{tt('Позиций', 'Pozitsiyalar')}</th>
                <th className="py-2 pr-3">{tt('Котировок', 'Kotirovkalar')}</th><th className="py-2">{tt('Статус', 'Holat')}</th>
              </tr>
            </thead>
            <tbody>
              {rfqs.map((r) => (
                <tr key={r.id} className="border-b border-slate-50 dark:border-slate-800/60">
                  <td className="py-2 pr-3 whitespace-nowrap">{new Date(r.createdAt).toLocaleDateString('ru-RU')}</td>
                  <td className="py-2 pr-3 font-medium">{r.title}</td>
                  <td className="py-2 pr-3">{r.buyer?.company || r.buyer?.fullName || '—'}</td>
                  <td className="py-2 pr-3">{r.items?.length ?? 0}</td>
                  <td className="py-2 pr-3">{r._count?.quotes ?? 0}</td>
                  <td className="py-2">{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rfqs.length === 0 && <div className="py-10 text-center text-ink-subtle">{tt('Запросов пока нет', 'Hozircha soʻrovlar yoʻq')}</div>}
        </div>
      )}

      {tab === 'certs' && (
        <div className="mt-6">
          <p className="mb-4 text-sm text-ink-muted">
            {tt('Анти-фальсификат: офферы с документами, ожидающие проверки платформой. После подтверждения покупатель видит значок «Проверено платформой».',
                'Anti-kontrafakt: platforma tekshiruvini kutayotgan hujjatli takliflar. Tasdiqdan soʻng xaridor «Platforma tekshirgan» belgisini koʻradi.')}
          </p>
          <div className="space-y-3">
            {certQueue.map((o) => (
              <div key={o.id} className="card flex flex-wrap items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{o.product?.name}</div>
                  <div className="text-xs text-ink-muted">
                    {o.seller?.company ?? o.seller?.fullName}
                    {o.product?.manufacturer ? ` · ${o.product.manufacturer}` : ''}
                    {o.regNumber ? ` · ${tt('рег. №', 'roʻyx. №')} ${o.regNumber}` : ''}
                    {o.batchNumber ? ` · ${tt('партия', 'partiya')} ${o.batchNumber}` : ''}
                  </div>
                  {(o.certificates ?? []).length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-2">
                      {o.certificates.map((c: string, i: number) => (
                        <a key={i} href={c} target="_blank" rel="noreferrer" className="text-xs text-teal-700 underline">{tt('сертификат', 'sertifikat')} {i + 1}</a>
                      ))}
                    </div>
                  )}
                </div>
                <button className="btn-primary !px-3 !py-2" onClick={() => verifyOffer(o.id)}>
                  <ShieldCheck size={15} /> {tt('Подтвердить', 'Tasdiqlash')}
                </button>
              </div>
            ))}
            {certQueue.length === 0 && <div className="py-10 text-center text-ink-subtle">{tt('Очередь пуста — все офферы проверены', 'Navbat boʻsh — barcha takliflar tekshirilgan')}</div>}
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-ink-subtle">
              <tr className="border-b border-slate-100"><th className="py-2">{tt('Имя', 'Ism')}</th><th>{tt('Роль', 'Rol')}</th><th>{tt('Компания', 'Kompaniya')}</th><th>{tt('Статус', 'Holat')}</th><th></th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-slate-50">
                  <td className="py-2">{u.fullName}<div className="text-xs text-ink-subtle">{u.email}</div></td>
                  <td>{u.role}</td>
                  <td>{u.company ?? '—'}</td>
                  <td>
                    {u.isBanned ? <span className="text-red-500">{tt('Заблокирован', 'Bloklangan')}</span>
                      : u.isVerified ? <span className="inline-flex items-center gap-1 text-teal-700"><ShieldCheck size={14} />{tt('Проверен', 'Tasdiqlangan')}</span>
                      : <span className="text-amber-600">{tt('Не проверен', 'Tasdiqlanmagan')}</span>}
                  </td>
                  <td className="flex gap-2 py-2">
                    {!u.isVerified && u.role === 'SELLER' && <button className="btn-ghost !px-2 !py-1 text-teal-700" onClick={() => verify(u.id)}><Check size={15} /></button>}
                    {u.role !== 'ADMIN' && <button className="btn-ghost !px-2 !py-1 text-red-500" onClick={() => ban(u.id, !u.isBanned)} title={u.isBanned ? tt('Разблокировать', 'Blokdan chiqarish') : tt('Заблокировать', 'Bloklash')}><Ban size={15} /></button>}
                    {u.role !== 'ADMIN' && <button className="btn-ghost !px-2 !py-1 text-red-500" onClick={() => delUser(u.id, u.email)} title={tt('Удалить', 'Oʻchirish')}><Trash2 size={15} /></button>}
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
              <button className="btn-primary !px-3 !py-2" onClick={() => approve(r.id)}><Check size={16} /> {tt('Одобрить', 'Maʼqullash')}</button>
            </div>
          ))}
          {reviews.length === 0 && <div className="py-10 text-center text-ink-subtle">{tt('Нет отзывов на модерации', 'Moderatsiyada sharhlar yoʻq')}</div>}
        </div>
      )}

      {tab === 'leads' && (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-ink-subtle">
              <tr className="border-b border-slate-100"><th className="py-2">{tt('Дата', 'Sana')}</th><th>{tt('Источник', 'Manba')}</th><th>{tt('Клиент', 'Mijoz')}</th><th>{tt('Товар', 'Mahsulot')}</th><th>{tt('Статус', 'Holat')}</th></tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id} className="border-b border-slate-50">
                  <td className="py-2">{new Date(l.createdAt).toLocaleDateString('ru-RU')}</td>
                  <td><span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs">{l.source === 'TELEGRAM' ? 'Telegram' : tt('Сайт', 'Sayt')}</span></td>
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
          {leads.length === 0 && <div className="py-10 text-center text-ink-subtle">{tt('Заявок пока нет', 'Hozircha arizalar yoʻq')}</div>}
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
                  {c.answer && <p className="mt-2 rounded-lg bg-teal-50 p-2 text-sm text-teal-800"><b>{tt('Ответ:', 'Javob:')}</b> {c.answer}</p>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`rounded-md px-2 py-0.5 text-xs ${c.status === 'ANSWERED' ? 'bg-teal-100 text-teal-700' : c.status === 'NEW' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100'}`}>
                    {CONSULT_STATUS[c.status]}
                  </span>
                  <button className="btn-secondary !px-3 !py-1.5 text-xs" onClick={() => answerConsult(c.id)}>{tt('Ответить', 'Javob berish')}</button>
                </div>
              </div>
            </div>
          ))}
          {consults.length === 0 && <div className="py-10 text-center text-ink-subtle">{tt('Консультаций пока нет', 'Hozircha konsultatsiyalar yoʻq')}</div>}
        </div>
      )}

      {tab === 'blog' && (
        <div className="mt-6">
          <button className="btn-primary mb-4" onClick={() => setEditingPost({ title: '', titleUz: '', content: '', contentUz: '', excerpt: '', excerptUz: '', image: '', published: true })}>
            <Plus size={16} /> {tt('Новая публикация', 'Yangi nashr')}
          </button>
          <div className="space-y-2">
            {posts.map((p) => (
              <div key={p.id} className="card flex items-center justify-between p-4">
                <div>
                  <div className="font-medium">{p.title} {!p.published && <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700">{tt('черновик', 'qoralama')}</span>}</div>
                  <div className="text-xs text-ink-subtle">{new Date(p.createdAt).toLocaleDateString('ru-RU')} · /{p.slug}</div>
                </div>
                <div className="flex gap-1">
                  <button className="btn-ghost !px-2 !py-1" onClick={() => setEditingPost(p)}><Pencil size={15} /></button>
                  <button className="btn-ghost !px-2 !py-1 text-red-500" onClick={() => delPost(p.id)}><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
            {posts.length === 0 && <div className="py-10 text-center text-ink-subtle">{tt('Публикаций пока нет', 'Hozircha nashrlar yoʻq')}</div>}
          </div>
        </div>
      )}

      {editingPost && (
        <BlogForm initial={editingPost} onClose={() => setEditingPost(null)} onSaved={() => { setEditingPost(null); load(); }} />
      )}
    </div>
  );
}

function BlogForm({ initial, onClose, onSaved }: any) {
  const { tt } = useI18n();
  const [form, setForm] = useState<any>(initial);
  const [saving, setSaving] = useState(false);
  const upd = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.title || !form.content) return toast.error(tt('Заголовок и текст обязательны', 'Sarlavha va matn majburiy'));
    setSaving(true);
    const payload = {
      title: form.title,
      titleUz: form.titleUz || undefined,
      content: form.content,
      contentUz: form.contentUz || undefined,
      excerpt: form.excerpt || undefined,
      excerptUz: form.excerptUz || undefined,
      image: form.image || undefined,
      published: form.published,
    };
    try {
      if (form.id) await api.patch(`/blog/${form.id}`, payload);
      else await api.post('/blog', payload);
      toast.success(tt('Сохранено', 'Saqlandi'));
      onSaved();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? tt('Ошибка', 'Xatolik'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-heading text-xl font-bold">{form.id ? tt('Редактировать публикацию', 'Nashrni tahrirlash') : tt('Новая публикация', 'Yangi nashr')}</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <div className="space-y-3">
          <input className="input" placeholder={tt('Заголовок (RU)', 'Sarlavha (RU)')} value={form.title} onChange={(e) => upd('title', e.target.value)} />
          <input className="input" placeholder={tt('Заголовок (UZ)', 'Sarlavha (UZ)')} value={form.titleUz} onChange={(e) => upd('titleUz', e.target.value)} />
          <input className="input" placeholder={tt('Краткое описание (RU)', 'Qisqacha tavsif (RU)')} value={form.excerpt} onChange={(e) => upd('excerpt', e.target.value)} />
          <input className="input" placeholder={tt('Краткое описание (UZ)', 'Qisqacha tavsif (UZ)')} value={form.excerptUz ?? ''} onChange={(e) => upd('excerptUz', e.target.value)} />
          <input className="input" placeholder={tt('URL картинки', 'Rasm URL')} value={form.image} onChange={(e) => upd('image', e.target.value)} />
          <textarea className="input !h-auto py-2" rows={6} placeholder={tt('Текст (RU)', 'Matn (RU)')} value={form.content} onChange={(e) => upd('content', e.target.value)} />
          <textarea className="input !h-auto py-2" rows={4} placeholder={tt('Текст (UZ)', 'Matn (UZ)')} value={form.contentUz} onChange={(e) => upd('contentUz', e.target.value)} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.published} onChange={(e) => upd('published', e.target.checked)} className="h-4 w-4 accent-teal-600" />
            {tt('Опубликовать', 'Chop etish')}
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>{tt('Отмена', 'Bekor qilish')}</button>
          <button className="btn-primary" disabled={saving} onClick={save}>{saving ? '…' : tt('Сохранить', 'Saqlash')}</button>
        </div>
      </div>
    </div>
  );
}

function Row({ l, v }: { l: string; v: number | string }) {
  return <div className="flex justify-between"><span className="text-ink-muted">{l}</span><span className="font-semibold">{v}</span></div>;
}

export default function AdminDashboard() {
  return <RoleGuard role="ADMIN"><AdminContent /></RoleGuard>;
}
