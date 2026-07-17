'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Download, FileText, RotateCcw, CreditCard, Gift, Wallet, Package } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth, useCart } from '@/lib/store';
import { RoleGuard, StatCard, STATUS_LABELS } from '@/components/RoleGuard';
import { SpendArea, CategoryPie } from '@/components/Charts';
import { ProductCard } from '@/components/ProductCard';
import { CounterpartiesPanel } from '@/components/CounterpartiesPanel';
import { Product } from '@/lib/types';
import { formatMoney } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

interface Order {
  id: string;
  createdAt: string;
  status: string;
  total: number;
  subtotal: number;
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

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <SpendArea data={stats?.spendByMonth ?? []} />
        <CategoryPie data={stats?.byCategory ?? []} />
      </div>

      <CounterpartiesPanel />

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
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-ink-subtle">
            <tr className="border-b border-slate-100">
              <th className="py-2">№</th><th>{tt('Дата', 'Sana')}</th><th>{tt('Статус', 'Holat')}</th><th>{tt('Сумма', 'Summa')}</th><th></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-slate-50">
                <td className="py-2 font-mono text-xs"><Link href={`/orders/${o.id}`} className="text-teal-700 hover:underline">{o.id.slice(0, 8)}</Link></td>
                <td>{new Date(o.createdAt).toLocaleDateString('ru-RU')}</td>
                <td><span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs">{STATUS_LABELS[o.status]}</span></td>
                <td className="font-semibold">{formatMoney(o.total)}</td>
                <td className="flex items-center gap-2 py-2">
                  {o.status === 'PENDING' && (
                    <PayControl onPay={(provider) => pay(o.id, provider)} />
                  )}
                  <button className="btn-ghost !px-2 !py-1" onClick={() => repeat(o)} title={tt('Повторить', 'Takrorlash')}><RotateCcw size={15} /></button>
                  <button className="btn-ghost !px-2 !py-1" onClick={() => invoice(o.id)} title={tt('Счёт PDF', 'Hisob-faktura PDF')}><FileText size={15} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && <div className="py-10 text-center text-ink-subtle">{tt('Заказов пока нет', 'Hozircha buyurtmalar yoʻq')}</div>}
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
