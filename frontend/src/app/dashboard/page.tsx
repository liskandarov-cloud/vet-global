'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Download, FileText, RotateCcw, CreditCard, Gift, Wallet, Package, User, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth, useCart } from '@/lib/store';
import { RoleGuard, StatCard, STATUS_LABELS } from '@/components/RoleGuard';
import { SpendArea, CategoryPie } from '@/components/Charts';
import { ProductCard } from '@/components/ProductCard';
import { CounterpartiesPanel } from '@/components/CounterpartiesPanel';
import { ProfilePanel } from '@/components/ProfilePanel';
import { Product } from '@/lib/types';
import { formatMoney } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

interface Order {
  id: string;
  createdAt: string;
  status: string;
  total: number;
  subtotal: number;
  requiresConfirmation?: boolean;
  items: { productId: string; offerId?: string | null; productName: string; quantity: number; price: number }[];
}
interface Tx { id: string; amount: number; type: string; description: string; createdAt: string }

function downloadBlob(data: BlobPart, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function BuyerContent() {
  const { tt } = useI18n();
  const { user } = useAuth();
  const addToCart = useCart((s) => s.add);
  const [orders, setOrders] = useState<Order[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [showProfile, setShowProfile] = useState(false);
  const [orderFilter, setOrderFilter] = useState<'all' | 'topay' | 'preorder' | 'active' | 'done'>('all');

  // Группа заказа для фильтра: сначала действия покупателя (оплата/предзаказ),
  // затем состояние (в работе / завершён).
  const bucket = (o: Order): 'topay' | 'preorder' | 'active' | 'done' =>
    o.status === 'PENDING' && o.requiresConfirmation ? 'preorder'
    : o.status === 'PENDING' ? 'topay'
    : o.status === 'DELIVERED' || o.status === 'CANCELLED' ? 'done'
    : 'active';

  const load = () => {
    api.get('/orders').then((r) => setOrders(r.data));
    api.get('/vetpoints/transactions').then((r) => setTxs(r.data));
    api.get('/buyer/stats').then((r) => setStats(r.data)).catch(() => {});
    api.get('/favorites').then((r) => setFavorites(r.data)).catch(() => {});
  };
  useEffect(load, []);

  const repeat = (o: Order) => {
    o.items.forEach((it) =>
      addToCart({ productId: it.productId, offerId: it.offerId ?? undefined, name: it.productName, price: it.price, minOrder: 1 }, it.quantity),
    );
    toast.success(tt('Товары добавлены в корзину', 'Mahsulotlar savatga qoʻshildi'));
  };

  const invoice = async (id: string) => {
    const { data } = await api.get(`/orders/${id}/invoice`, { responseType: 'blob' });
    downloadBlob(data, `invoice-${id.slice(0, 8)}.pdf`, 'application/pdf');
  };

  const pay = async (orderId: string, provider: string) => {
    try {
      const { data } = await api.post('/payments', { orderId, provider });
      if (data.mock) {
        await api.post(`/payments/${data.id}/mock-confirm`);
        toast.success(tt('Оплата прошла (демо)', 'Toʻlov amalga oshdi (demo)'));
        load();
      } else {
        window.open(data.paymentUrl, '_blank');
        toast.info(tt('Открыта страница оплаты', 'Toʻlov sahifasi ochildi'));
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? tt('Ошибка оплаты', 'Toʻlov xatosi'));
    }
  };

  const exportExcel = async () => {
    const { data } = await api.get('/orders/export', { responseType: 'blob' });
    downloadBlob(data, 'orders.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6">
        <span className="eyebrow">{tt('Кабинет', 'Kabinet')}</span>
        <h1 className="mt-3 section-title">{tt('Покупатель', 'Xaridor')}</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={tt('Баланс VetPoints', 'VetPoints balansi')} value={formatMoney(user?.vetPointsBalance ?? 0)} accent icon={Gift} />
        <StatCard label={tt('Потрачено', 'Sarflangan')} value={formatMoney(stats?.totalSpent ?? 0)} icon={Wallet} />
        <StatCard label={tt('Заказов', 'Buyurtmalar')} value={String(stats?.ordersCount ?? orders.length)} icon={Package} />
      </div>
      <p className="mt-2 text-xs text-ink-subtle">
        {tt('VetPoints — кэшбэк 1% от суммы заказа. Баллы начисляются на баланс, когда заказ переходит в статус «Доставлен», и их можно потратить на следующие покупки (до 10% суммы).',
            'VetPoints — buyurtma summasidan 1% keshbek. Ballar buyurtma «Yetkazilgan» holatiga oʻtganda hisoblanadi va keyingi xaridlarga sarflash mumkin (summaning 10% gacha).')}
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <SpendArea data={stats?.spendByMonth ?? []} />
        <CategoryPie data={stats?.byCategory ?? []} />
      </div>

      <CounterpartiesPanel />

      <div className="mt-8">
        <button onClick={() => setShowProfile((v) => !v)}
          className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left font-medium transition-colors hover:border-teal-200 dark:border-slate-800 dark:bg-slate-900">
          <span className="flex items-center gap-2"><User size={18} className="text-teal-700" /> {tt('Профиль и безопасность', 'Profil va xavfsizlik')}</span>
          <ChevronDown size={18} className={`text-ink-subtle transition-transform ${showProfile ? 'rotate-180' : ''}`} />
        </button>
        {showProfile && <ProfilePanel role="BUYER" />}
      </div>

      {favorites.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 font-heading text-xl font-bold">{tt('Избранное', 'Sevimlilar')}</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {favorites.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      )}

      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-heading text-xl font-bold">{tt('Мои заказы', 'Mening buyurtmalarim')}</h2>
        <button className="btn-secondary" onClick={exportExcel}><Download size={16} /> Excel</button>
      </div>

      {/* Фильтр заказов со счётчиками */}
      <div className="mt-3 flex flex-wrap gap-2">
        {([
          ['all', tt('Все', 'Barchasi')],
          ['topay', tt('Ждут оплаты', 'Toʻlov kutmoqda')],
          ['preorder', tt('Предзаказы', 'Oldindan buyurtma')],
          ['active', tt('В работе', 'Jarayonda')],
          ['done', tt('Завершённые', 'Yakunlangan')],
        ] as [typeof orderFilter, string][]).map(([k, label]) => {
          const cnt = k === 'all' ? orders.length : orders.filter((o) => bucket(o) === k).length;
          return (
            <button key={k} onClick={() => setOrderFilter(k)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${orderFilter === k ? 'border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-950/40' : 'border-slate-200 text-ink-muted hover:border-teal-200'}`}>
              {label} <span className="opacity-70">· {cnt}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-ink-subtle">
            <tr className="border-b border-slate-100">
              <th className="py-2">№</th><th>{tt('Дата', 'Sana')}</th><th>{tt('Статус', 'Holat')}</th><th>{tt('Сумма', 'Summa')}</th><th></th>
            </tr>
          </thead>
          <tbody>
            {orders.filter((o) => orderFilter === 'all' || bucket(o) === orderFilter).map((o) => (
              <tr key={o.id} className="border-b border-slate-50">
                <td className="py-2 font-mono text-xs"><Link href={`/orders/${o.id}`} className="text-teal-700 hover:underline">{o.id.slice(0, 8)}</Link></td>
                <td>{new Date(o.createdAt).toLocaleDateString('ru-RU')}</td>
                <td><span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs">{STATUS_LABELS[o.status]}</span></td>
                <td className="font-semibold">{formatMoney(o.total)}</td>
                <td className="flex items-center gap-2 py-2">
                  {o.status === 'PENDING' && o.requiresConfirmation ? (
                    <span className="rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">{tt('Ждёт подтверждения продавца', 'Sotuvchi tasdigʻini kutmoqda')}</span>
                  ) : o.status === 'PENDING' ? (
                    <PayControl onPay={(provider) => pay(o.id, provider)} />
                  ) : null}
                  <button className="btn-ghost !px-2 !py-1" onClick={() => repeat(o)} title={tt('Повторить', 'Takrorlash')}><RotateCcw size={15} /></button>
                  <button className="btn-ghost !px-2 !py-1" onClick={() => invoice(o.id)} title={tt('Счёт PDF', 'Hisob-faktura PDF')}><FileText size={15} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.filter((o) => orderFilter === 'all' || bucket(o) === orderFilter).length === 0 && (
          <div className="py-10 text-center text-ink-subtle">
            {orders.length === 0 ? tt('Заказов пока нет', 'Hozircha buyurtmalar yoʻq') : tt('Нет заказов в этой группе', 'Bu guruhda buyurtma yoʻq')}
          </div>
        )}
      </div>

      <h2 className="mt-10 font-heading text-xl font-bold">{tt('История VetPoints', 'VetPoints tarixi')}</h2>
      <div className="mt-3 space-y-2">
        {txs.map((t) => (
          <div key={t.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-2 text-sm">
            <span>{t.description}</span>
            <span className={t.amount >= 0 ? 'font-semibold text-teal-700' : 'font-semibold text-secondary'}>
              {t.amount >= 0 ? '+' : ''}{formatMoney(t.amount)}
            </span>
          </div>
        ))}
        {txs.length === 0 && <div className="py-6 text-center text-ink-subtle">{tt('Пока нет операций', 'Hozircha amallar yoʻq')}</div>}
      </div>
    </div>
  );
}

function PayControl({ onPay }: { onPay: (provider: string) => void }) {
  const { tt } = useI18n();
  const [provider, setProvider] = useState('CLICK');
  return (
    <span className="inline-flex items-center gap-1">
      <select className="input !h-8 !w-auto !px-1 text-xs" value={provider} onChange={(e) => setProvider(e.target.value)}>
        <option value="CLICK">Click</option>
        <option value="PAYME">Payme</option>
        <option value="UZUM">UZUM</option>
      </select>
      <button className="btn-primary !px-2 !py-1 text-xs" onClick={() => onPay(provider)} title={tt('Оплатить', 'Toʻlash')}>
        <CreditCard size={14} /> {tt('Оплатить', 'Toʻlash')}
      </button>
    </span>
  );
}

export default function BuyerDashboard() {
  return <RoleGuard role="BUYER"><BuyerContent /></RoleGuard>;
}
